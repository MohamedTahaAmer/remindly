import { spawn } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import Anthropic from "@anthropic-ai/sdk"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import { loadEnv } from "vite"
import { z } from "zod"
import type { ServerResponse } from "node:http"
import type { Connect, Plugin } from "vite"

// Local-only Descript-style video editor backend (/video-agent). Everything here
// needs ffmpeg + real disk I/O, and the SSR runtime is workerd (unenv stub fs),
// so like pasted-images this runs as Node middleware on the Vite server instead
// of a server route. Working files live under _local/video-agent (gitignored).
let BASE = ""
let ASSEMBLYAI_API_KEY = ""
let ANTHROPIC_API_KEY = ""

const ID_RE = /^va-[0-9]{8}-[0-9]{6}-[a-z0-9]{1,8}$/
const VIDEO_EXTS: Record<string, string> = {
	mp4: "video/mp4",
	webm: "video/webm",
	mov: "video/quicktime",
	mkv: "video/x-matroska",
	m4v: "video/x-m4v",
}

type Word = { text: string; start: number; end: number; confidence: number } // seconds
type Span = { start: number; end: number } // seconds
type AiCut = {
	firstWord: number
	lastWord: number
	reason: "repeated_word" | "repeated_sentence" | "false_start" | "retake" | "filler"
	text: string
	confidence: "high" | "medium" | "low"
	start: number
	end: number // filled in server-side from word times
}
type ProjectState = {
	id: string
	name: string
	createdAt: string
	status: "processing" | "ready" | "error"
	step: "saving" | "probing" | "extracting-audio" | "detecting-silence" | "transcribing" | "done"
	error?: string
	duration: number
	hasAudio: boolean
	silences: Array<Span>
	words: Array<Word> | null // null => no transcript (missing key or ASR failure)
	transcriptError?: string // human-readable reason words are null
	analysis?: { cuts: Array<AiCut>; flagged: boolean; at: string }
	export: { status: "none" | "rendering" | "ready" | "error"; error?: string }
}

function dirOf(id: string) {
	return path.join(BASE, id)
}

function sourceOf(id: string): string | null {
	const dir = dirOf(id)
	if (!fs.existsSync(dir)) return null
	const name = fs.readdirSync(dir).find((f) => f.startsWith("source."))
	return name ? path.join(dir, name) : null
}

function readState(id: string): ProjectState | null {
	const file = path.join(dirOf(id), "state.json")
	if (!fs.existsSync(file)) return null
	try {
		return JSON.parse(fs.readFileSync(file, "utf8")) as ProjectState
	} catch {
		return null
	}
}

function writeState(state: ProjectState) {
	const dir = dirOf(state.id)
	const tmp = path.join(dir, `state.json.tmp-${process.pid}`)
	fs.writeFileSync(tmp, JSON.stringify(state, null, "\t"))
	fs.renameSync(tmp, path.join(dir, "state.json"))
}

function patchState(id: string, patch: Partial<ProjectState>): ProjectState | null {
	const state = readState(id)
	if (!state) return null
	const next = { ...state, ...patch }
	writeState(next)
	return next
}

function json(res: ServerResponse, status: number, body: unknown) {
	res.statusCode = status
	res.setHeader("content-type", "application/json")
	res.end(JSON.stringify(body))
}

function run(cmd: string, args: Array<string>): Promise<{ stdout: string; stderr: string }> {
	return new Promise((resolve, reject) => {
		const child = spawn(cmd, args)
		let stdout = ""
		let stderr = ""
		child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString()))
		child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()))
		child.on("error", reject)
		child.on("close", (code) => {
			if (code === 0) resolve({ stdout, stderr })
			else reject(new Error(`${cmd} exited with ${code}: ${stderr.slice(-2000)}`))
		})
	})
}

function readBody(req: Connect.IncomingMessage): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const chunks: Array<Buffer> = []
		req.on("data", (chunk: Buffer) => chunks.push(chunk))
		req.on("end", () => resolve(Buffer.concat(chunks)))
		req.on("error", reject)
	})
}

// ── processing pipeline (runs async after /upload responds) ──

async function processProject(id: string) {
	const dir = dirOf(id)
	const source = sourceOf(id)
	if (!source) throw new Error("source file missing")

	patchState(id, { step: "probing" })
	const probe = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", source])
	const duration = Number.parseFloat(probe.stdout.trim())
	if (!Number.isFinite(duration) || duration <= 0) throw new Error(`could not read duration (ffprobe said: ${probe.stdout.trim()})`)

	const streams = await run("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type", "-of", "csv=p=0", source])
	const hasAudio = streams.stdout.includes("audio")
	patchState(id, { duration, hasAudio })

	if (!hasAudio) {
		patchState(id, { silences: [], words: null, transcriptError: "video has no audio track", step: "done", status: "ready" })
		return
	}

	patchState(id, { step: "extracting-audio" })
	const wav = path.join(dir, "audio.wav")
	await run("ffmpeg", ["-y", "-i", source, "-vn", "-ac", "1", "-ar", "16000", wav])

	patchState(id, { step: "detecting-silence" })
	const silence = await run("ffmpeg", ["-hide_banner", "-nostats", "-i", wav, "-af", "silencedetect=noise=-35dB:d=0.7", "-f", "null", "-"])
	const silences: Array<Span> = []
	let pendingStart: number | null = null
	for (const line of silence.stderr.split("\n")) {
		const start = line.match(/silence_start:\s*(-?[\d.]+)/)
		const end = line.match(/silence_end:\s*(-?[\d.]+)/)
		if (start) pendingStart = Number.parseFloat(start[1])
		if (end && pendingStart !== null) {
			silences.push({ start: Math.max(0, pendingStart), end: Number.parseFloat(end[1]) })
			pendingStart = null
		}
	}
	// a trailing start with no end means silence runs to the end of the file
	if (pendingStart !== null) silences.push({ start: Math.max(0, pendingStart), end: duration })
	patchState(id, { silences })

	patchState(id, { step: "transcribing" })
	if (!ASSEMBLYAI_API_KEY) {
		patchState(id, { words: null, transcriptError: "ASSEMBLYAI_API_KEY is not set in .env.local", step: "done", status: "ready" })
		return
	}
	try {
		const words = await transcribe(wav)
		patchState(id, { words, step: "done", status: "ready" })
	} catch (err) {
		patchState(id, { words: null, transcriptError: `transcription failed: ${(err as Error).message}`, step: "done", status: "ready" })
	}
}

async function transcribe(wavPath: string): Promise<Array<Word>> {
	// 16k mono WAV is ~2 MB/min, buffering it is fine
	const upload = await fetch("https://api.assemblyai.com/v2/upload", {
		method: "POST",
		headers: { authorization: ASSEMBLYAI_API_KEY },
		body: new Uint8Array(fs.readFileSync(wavPath)),
	})
	if (!upload.ok) throw new Error(`AssemblyAI upload: HTTP ${upload.status}`)
	const { upload_url } = (await upload.json()) as { upload_url: string }

	// disfluencies surfaces "um"/"uh" as words; format_text: false keeps words
	// verbatim so index math stays honest
	const create = await fetch("https://api.assemblyai.com/v2/transcript", {
		method: "POST",
		headers: { authorization: ASSEMBLYAI_API_KEY, "content-type": "application/json" },
		body: JSON.stringify({ audio_url: upload_url, speech_model: "universal", disfluencies: true, punctuate: true, format_text: false }),
	})
	if (!create.ok) throw new Error(`AssemblyAI transcript create: HTTP ${create.status}`)
	const { id: transcriptId } = (await create.json()) as { id: string }

	for (;;) {
		await new Promise((resolve) => setTimeout(resolve, 3000))
		const poll = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, { headers: { authorization: ASSEMBLYAI_API_KEY } })
		if (!poll.ok) throw new Error(`AssemblyAI poll: HTTP ${poll.status}`)
		const data = (await poll.json()) as {
			status: string
			error?: string
			words?: Array<{ text: string; start: number; end: number; confidence: number }>
		}
		if (data.status === "completed")
			return (data.words ?? []).map((w) => ({ text: w.text, start: w.start / 1000, end: w.end / 1000, confidence: w.confidence }))
		if (data.status === "error") throw new Error(data.error ?? "unknown AssemblyAI error")
	}
}

// ── AI mistakes pass ──

const CutList = z.object({
	cuts: z.array(
		z.object({
			first_word: z.number().int(),
			last_word: z.number().int(),
			reason: z.enum(["repeated_word", "repeated_sentence", "false_start", "retake", "filler"]),
			text: z.string(), // exact words being cut, verbatim — used for validation
			confidence: z.enum(["high", "medium", "low"]),
		}),
	),
})

const EDIT_POLICY = `You are a video-editing assistant. You receive a spoken-word transcript where every word
is prefixed with its index like [12]word. Identify spans that should be CUT from the video
to tighten it, and return them via the required output format.

What to cut:
- repeated_word: immediate repeats and stutters ("the the", "I- I think"). Keep the LAST
  occurrence, cut the earlier ones.
- repeated_sentence / retake: the speaker restarts or re-records a sentence (says nearly
  the same sentence twice, or says things like "let me try that again"). Keep the LAST,
  most complete take; cut the earlier take(s) AND the retake announcement itself.
- false_start: abandoned sentence fragments that go nowhere.
- filler: discourse fillers ("um", "uh", "you know", "sort of", "I mean") ONLY when they
  carry no meaning. "I like this approach" keeps "like". Standalone "um"/"uh" are already
  handled elsewhere - only flag filler PHRASES here.

Rules:
- Cut only verbatim spans. The remaining words, in order, must read as natural fluent speech.
- first_word and last_word are inclusive indices into the given transcript.
- In "text", echo the exact words of the span, verbatim, in order.
- Be conservative. If removing a span could change meaning or sound unnatural, either skip
  it or mark it confidence "low". Never cut content that is merely redundant in meaning
  but worded differently - only true verbal mistakes.
- If there is nothing to cut, return an empty list.`

function normalizeForEcho(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s]/gu, "")
		.replace(/\s+/g, " ")
		.trim()
}

async function analyze(state: ProjectState): Promise<{ cuts: Array<AiCut>; flagged: boolean }> {
	const words = state.words
	if (!words) throw new Error("no transcript available")

	const numberedTranscript = words.map((w, i) => `[${i}]${w.text}`).join(" ")
	const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY })
	// claude-opus-5: thinking is adaptive by default (omit the param), temperature removed
	const response = await client.messages.parse({
		model: "claude-opus-5",
		max_tokens: 16000,
		system: EDIT_POLICY,
		messages: [{ role: "user", content: numberedTranscript }],
		output_config: { format: zodOutputFormat(CutList) },
	})
	if (response.parsed_output === null) throw new Error("model returned unparseable output")

	// validation: bounds, echo check (the hallucination guard), sort, merge overlaps
	const valid = response.parsed_output.cuts.filter((c) => {
		if (!(c.first_word >= 0 && c.first_word <= c.last_word && c.last_word < words.length)) return false
		const actual = words
			.slice(c.first_word, c.last_word + 1)
			.map((w) => w.text)
			.join(" ")
		return normalizeForEcho(c.text) === normalizeForEcho(actual)
	})
	valid.sort((a, b) => a.first_word - b.first_word)

	const merged: Array<(typeof valid)[number]> = []
	for (const cut of valid) {
		const prev = merged.at(-1)
		if (prev && cut.first_word <= prev.last_word + 1) {
			if (cut.last_word > prev.last_word) prev.last_word = cut.last_word
		} else {
			merged.push({ ...cut })
		}
	}

	const cuts: Array<AiCut> = merged.map((c) => ({
		firstWord: c.first_word,
		lastWord: c.last_word,
		reason: c.reason,
		confidence: c.confidence,
		text: words
			.slice(c.first_word, c.last_word + 1)
			.map((w) => w.text)
			.join(" "),
		start: Math.max(0, words[c.first_word].start - 0.04),
		end: Math.min(state.duration, words[c.last_word].end + 0.04),
	}))

	const totalCut = cuts.reduce((sum, c) => sum + (c.end - c.start), 0)
	const flagged = totalCut > state.duration * 0.4
	return { cuts, flagged }
}

// ── export render ──

function sanitizeCuts(raw: Array<Span>, duration: number): Array<Span> {
	const clamped = raw
		.filter((c) => Number.isFinite(c.start) && Number.isFinite(c.end))
		.map((c) => ({ start: Math.max(0, Math.min(duration, c.start)), end: Math.max(0, Math.min(duration, c.end)) }))
		.filter((c) => c.end > c.start)
		.sort((a, b) => a.start - b.start)
	const merged: Array<Span> = []
	for (const cut of clamped) {
		const prev = merged.at(-1)
		if (prev && cut.start < prev.end + 0.05) prev.end = Math.max(prev.end, cut.end)
		else merged.push({ ...cut })
	}
	return merged
}

async function renderExport(id: string, cuts: Array<Span>) {
	const dir = dirOf(id)
	const state = readState(id)
	const source = sourceOf(id)
	if (!state || !source) throw new Error("project missing")

	const out = path.join(dir, "export.mp4")
	const merged = sanitizeCuts(cuts, state.duration)
	if (merged.length === 0) {
		await run("ffmpeg", ["-y", "-i", source, "-c", "copy", out])
		return
	}

	// invert cuts → keep-segments, drop slivers
	const keeps: Array<Span> = []
	let cursor = 0
	for (const cut of merged) {
		if (cut.start - cursor >= 0.1) keeps.push({ start: cursor, end: cut.start })
		cursor = Math.max(cursor, cut.end)
	}
	if (state.duration - cursor >= 0.1) keeps.push({ start: cursor, end: state.duration })
	if (keeps.length === 0) throw new Error("cuts remove the entire video")

	const withAudio = state.hasAudio
	const lines: Array<string> = []
	const refs: Array<string> = []
	keeps.forEach((k, i) => {
		const s = k.start.toFixed(3)
		const e = k.end.toFixed(3)
		lines.push(`[0:v]trim=start=${s}:end=${e},setpts=PTS-STARTPTS[v${i}];`)
		if (withAudio) lines.push(`[0:a]atrim=start=${s}:end=${e},asetpts=PTS-STARTPTS[a${i}];`)
		refs.push(withAudio ? `[v${i}][a${i}]` : `[v${i}]`)
	})
	lines.push(`${refs.join("")}concat=n=${keeps.length}:v=1:a=${withAudio ? 1 : 0}${withAudio ? "[vout][aout]" : "[vout]"}`)
	const filterFile = path.join(dir, "filter.txt")
	fs.writeFileSync(filterFile, lines.join("\n"))

	const args = ["-y", "-i", source, "-filter_complex_script", filterFile, "-map", "[vout]"]
	if (withAudio) args.push("-map", "[aout]")
	args.push("-c:v", "libx264", "-preset", "veryfast", "-crf", "20")
	if (withAudio) args.push("-c:a", "aac", "-b:a", "192k")
	args.push("-movflags", "+faststart", out)
	await run("ffmpeg", args)
}

// ── middleware ──

const middleware: Connect.NextHandleFunction = (req, res, next) => {
	const url = new URL(req.url ?? "/", "http://localhost")
	if (!url.pathname.startsWith("/api/video-agent")) {
		next()
		return
	}
	const rest = url.pathname.slice("/api/video-agent".length)

	try {
		if (rest === "/upload" && req.method === "POST") {
			const rawName = url.searchParams.get("name") ?? "video.mp4"
			const name = path.basename(rawName)
			const ext = path.extname(name).slice(1).toLowerCase()
			if (!(ext in VIDEO_EXTS)) {
				json(res, 400, { error: `unsupported video extension .${ext} (want ${Object.keys(VIDEO_EXTS).join("|")})` })
				return
			}
			const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15)
			const id = `va-${stamp}-${Math.random().toString(36).slice(2, 8)}`
			const dir = dirOf(id)
			fs.mkdirSync(dir, { recursive: true })
			writeState({
				id,
				name,
				createdAt: new Date().toISOString(),
				status: "processing",
				step: "saving",
				duration: 0,
				hasAudio: false,
				silences: [],
				words: null,
				export: { status: "none" },
			})
			// stream the body straight to disk — never buffer video in memory
			const file = fs.createWriteStream(path.join(dir, `source.${ext}`))
			req.pipe(file)
			file.on("error", (err) => {
				patchState(id, { status: "error", error: `saving upload failed: ${err.message}` })
				json(res, 500, { error: err.message })
			})
			file.on("finish", () => {
				json(res, 200, { id })
				processProject(id).catch((err: Error) => {
					patchState(id, { status: "error", error: err.message })
				})
			})
			return
		}

		if (rest === "/list" && req.method === "GET") {
			fs.mkdirSync(BASE, { recursive: true })
			const projects = fs
				.readdirSync(BASE)
				.filter((entry) => ID_RE.test(entry))
				.map((entry) => readState(entry))
				.filter((state): state is ProjectState => state !== null)
				.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
				.map((s) => ({ id: s.id, name: s.name, status: s.status, duration: s.duration, createdAt: s.createdAt }))
			json(res, 200, projects)
			return
		}

		// everything below is /:id/... — the id regex is the path-traversal guard
		const match = rest.match(/^\/([^/]+)(\/[a-z]+)?$/)
		const id = match?.[1] ?? ""
		const action = match?.[2] ?? ""
		if (!ID_RE.test(id)) {
			json(res, 404, { error: "unknown project" })
			return
		}
		const state = readState(id)
		if (!state) {
			json(res, 404, { error: "unknown project" })
			return
		}

		if (action === "/state" && req.method === "GET") {
			json(res, 200, state)
			return
		}

		if (action === "/video" && req.method === "GET") {
			const source = sourceOf(id)
			if (!source) {
				json(res, 404, { error: "source missing" })
				return
			}
			const size = fs.statSync(source).size
			const mime = VIDEO_EXTS[path.extname(source).slice(1)] ?? "application/octet-stream"
			res.setHeader("accept-ranges", "bytes")
			res.setHeader("content-type", mime)
			// byte ranges are required or <video> seeking breaks
			const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/)
			if (range && (range[1] !== "" || range[2] !== "")) {
				const start = range[1] === "" ? Math.max(0, size - Number.parseInt(range[2], 10)) : Number.parseInt(range[1], 10)
				const end = range[2] === "" || range[1] === "" ? size - 1 : Math.min(size - 1, Number.parseInt(range[2], 10))
				if (start > end || start >= size) {
					res.statusCode = 416
					res.setHeader("content-range", `bytes */${size}`)
					res.end()
					return
				}
				res.statusCode = 206
				res.setHeader("content-range", `bytes ${start}-${end}/${size}`)
				res.setHeader("content-length", String(end - start + 1))
				fs.createReadStream(source, { start, end }).pipe(res)
			} else {
				res.setHeader("content-length", String(size))
				fs.createReadStream(source).pipe(res)
			}
			return
		}

		if (action === "/analyze" && req.method === "POST") {
			if (!ANTHROPIC_API_KEY) {
				json(res, 400, { error: "ANTHROPIC_API_KEY is not set in .env.local" })
				return
			}
			if (!state.words || state.words.length === 0) {
				json(res, 400, { error: state.transcriptError ?? "no transcript available" })
				return
			}
			if (state.words.length > 20000) {
				json(res, 413, { error: "video too long for AI analysis" })
				return
			}
			// each run bills the API — return the cached result unless ?force=1
			if (state.analysis && url.searchParams.get("force") !== "1") {
				json(res, 200, { cuts: state.analysis.cuts, flagged: state.analysis.flagged })
				return
			}
			analyze(state)
				.then((result) => {
					patchState(id, { analysis: { ...result, at: new Date().toISOString() } })
					json(res, 200, result)
				})
				.catch((err: Error) => json(res, 500, { error: err.message }))
			return
		}

		if (action === "/export" && req.method === "POST") {
			if (state.export.status === "rendering") {
				json(res, 409, { error: "already rendering" })
				return
			}
			readBody(req)
				.then((body) => {
					const parsed = JSON.parse(body.toString() || "{}") as { cuts?: Array<Span> }
					const cuts = Array.isArray(parsed.cuts) ? parsed.cuts : []
					patchState(id, { export: { status: "rendering" } })
					json(res, 200, { ok: true })
					renderExport(id, cuts)
						.then(() => patchState(id, { export: { status: "ready" } }))
						.catch((err: Error) => patchState(id, { export: { status: "error", error: err.message } }))
				})
				.catch((err: Error) => json(res, 400, { error: `bad request body: ${err.message}` }))
			return
		}

		if (action === "/export" && req.method === "GET") {
			const file = path.join(dirOf(id), "export.mp4")
			if (state.export.status !== "ready" || !fs.existsSync(file)) {
				json(res, 404, { error: "no export available" })
				return
			}
			const base = state.name.replace(/\.[a-z0-9]+$/i, "").replace(/[^\w.-]+/g, "_")
			res.setHeader("content-type", "video/mp4")
			res.setHeader("content-length", String(fs.statSync(file).size))
			res.setHeader("content-disposition", `attachment; filename="${base}-edited.mp4"`)
			fs.createReadStream(file).pipe(res)
			return
		}

		if (action === "" && req.method === "DELETE") {
			fs.rmSync(dirOf(id), { recursive: true, force: true })
			json(res, 200, { ok: true })
			return
		}

		json(res, 404, { error: "not found" })
	} catch (err) {
		// never let an endpoint exception kill the dev server
		json(res, 500, { error: (err as Error).message })
	}
}

export function videoAgent(): Plugin {
	return {
		name: "video-agent",
		configResolved(config) {
			// loadEnv types values as string, but keys absent from .env are undefined
			const env = loadEnv(config.mode, config.root, "") as Record<string, string | undefined>
			BASE = path.resolve(config.root, "_local/video-agent")
			ASSEMBLYAI_API_KEY = env.ASSEMBLYAI_API_KEY ?? ""
			ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY ?? ""
		},
		configureServer(server) {
			server.middlewares.use(middleware)
		},
		configurePreviewServer(server) {
			server.middlewares.use(middleware)
		},
	}
}
