import fs from "node:fs"
import path from "node:path"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"

import { run } from "#/server/common/helpers/spawn.helper"
import { serverConfig } from "#/server/infrastructure/config/config"
import { EDIT_POLICY, PROJECT_ID_RE } from "./video-agent.constants.ts"
import { cutListSchema } from "./schema/video-agent.schema.ts"
import type { AiCut, ProjectState, Span, Word } from "./schema/video-agent.schema.ts"

/**
 * Descript-style video editor backend (/video-agent). Everything here needs
 * ffmpeg + real disk I/O; working files live under _local/video-agent
 * (gitignored). The heavy steps (probe, extract, silencedetect, transcribe,
 * render) run async after the endpoint has responded, driving state.json.
 */
export class VideoAgentService {
	private dirOf(id: string) {
		return path.join(serverConfig.videoAgentDir, id)
	}

	sourceOf(id: string): string | null {
		const dir = this.dirOf(id)
		if (!fs.existsSync(dir)) return null
		const name = fs.readdirSync(dir).find((f) => f.startsWith("source."))
		return name ? path.join(dir, name) : null
	}

	exportFileOf(id: string) {
		return path.join(this.dirOf(id), "export.mp4")
	}

	readState(id: string): ProjectState | null {
		const file = path.join(this.dirOf(id), "state.json")
		if (!fs.existsSync(file)) return null
		try {
			return JSON.parse(fs.readFileSync(file, "utf8")) as ProjectState
		} catch {
			return null
		}
	}

	private writeState(state: ProjectState) {
		// atomic: tmp file + rename, so a concurrent read never sees a torn write
		const dir = this.dirOf(state.id)
		const tmp = path.join(dir, `state.json.tmp-${process.pid}`)
		fs.writeFileSync(tmp, JSON.stringify(state, null, "\t"))
		fs.renameSync(tmp, path.join(dir, "state.json"))
	}

	patchState(id: string, patch: Partial<ProjectState>): ProjectState | null {
		const state = this.readState(id)
		if (!state) return null
		const next = { ...state, ...patch }
		this.writeState(next)
		return next
	}

	list() {
		fs.mkdirSync(serverConfig.videoAgentDir, { recursive: true })
		return fs
			.readdirSync(serverConfig.videoAgentDir)
			.filter((entry) => PROJECT_ID_RE.test(entry))
			.map((entry) => this.readState(entry))
			.filter((state): state is ProjectState => state !== null)
			.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
			.map((s) => ({ id: s.id, name: s.name, status: s.status, duration: s.duration, createdAt: s.createdAt }))
	}

	async createProject(name: string, ext: string, body: ReadableStream): Promise<string> {
		const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15)
		const id = `va-${stamp}-${Math.random().toString(36).slice(2, 8)}`
		const dir = this.dirOf(id)
		fs.mkdirSync(dir, { recursive: true })
		this.writeState({
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
		await pipeline(Readable.fromWeb(body as never), fs.createWriteStream(path.join(dir, `source.${ext}`)))
		return id
	}

	delete(id: string) {
		fs.rmSync(this.dirOf(id), { recursive: true, force: true })
	}

	// ── processing pipeline (runs async after /upload responds) ──

	async process(id: string) {
		const dir = this.dirOf(id)
		const source = this.sourceOf(id)
		if (!source) throw new Error("source file missing")

		this.patchState(id, { step: "probing" })
		const probe = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", source])
		const duration = Number.parseFloat(probe.stdout.trim())
		if (!Number.isFinite(duration) || duration <= 0) throw new Error(`could not read duration (ffprobe said: ${probe.stdout.trim()})`)

		const streams = await run("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type", "-of", "csv=p=0", source])
		const hasAudio = streams.stdout.includes("audio")
		this.patchState(id, { duration, hasAudio })

		if (!hasAudio) {
			this.patchState(id, { silences: [], words: null, transcriptError: "video has no audio track", step: "done", status: "ready" })
			return
		}

		this.patchState(id, { step: "extracting-audio" })
		const wav = path.join(dir, "audio.wav")
		await run("ffmpeg", ["-y", "-i", source, "-vn", "-ac", "1", "-ar", "16000", wav])

		this.patchState(id, { step: "detecting-silence" })
		const silences = await this.detectSilences(wav, duration)
		this.patchState(id, { silences })

		this.patchState(id, { step: "transcribing" })
		if (!serverConfig.assemblyAiApiKey) {
			this.patchState(id, { words: null, transcriptError: "ASSEMBLYAI_API_KEY is not set in .env.local", step: "done", status: "ready" })
			return
		}
		try {
			const words = await this.transcribe(wav)
			this.patchState(id, { words, step: "done", status: "ready" })
		} catch (err) {
			this.patchState(id, { words: null, transcriptError: `transcription failed: ${(err as Error).message}`, step: "done", status: "ready" })
		}
	}

	private async detectSilences(wav: string, duration: number): Promise<Array<Span>> {
		const result = await run("ffmpeg", ["-hide_banner", "-nostats", "-i", wav, "-af", "silencedetect=noise=-35dB:d=0.7", "-f", "null", "-"])
		const silences: Array<Span> = []
		let pendingStart: number | null = null
		for (const line of result.stderr.split("\n")) {
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
		return silences
	}

	private async transcribe(wavPath: string): Promise<Array<Word>> {
		const key = serverConfig.assemblyAiApiKey
		// 16k mono WAV is ~2 MB/min, buffering it is fine
		const upload = await fetch("https://api.assemblyai.com/v2/upload", {
			method: "POST",
			headers: { authorization: key },
			body: new Uint8Array(fs.readFileSync(wavPath)),
		})
		if (!upload.ok) throw new Error(`AssemblyAI upload: HTTP ${upload.status}`)
		const { upload_url } = (await upload.json()) as { upload_url: string }

		// disfluencies surfaces "um"/"uh" as words; format_text: false keeps words
		// verbatim so index math stays honest
		const create = await fetch("https://api.assemblyai.com/v2/transcript", {
			method: "POST",
			headers: { authorization: key, "content-type": "application/json" },
			body: JSON.stringify({ audio_url: upload_url, speech_model: "universal", disfluencies: true, punctuate: true, format_text: false }),
		})
		if (!create.ok) throw new Error(`AssemblyAI transcript create: HTTP ${create.status}`)
		const { id: transcriptId } = (await create.json()) as { id: string }

		for (;;) {
			await new Promise((resolve) => setTimeout(resolve, 3000))
			const poll = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, { headers: { authorization: key } })
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

	private normalizeForEcho(text: string): string {
		return text
			.toLowerCase()
			.replace(/[^\p{L}\p{N}\s]/gu, "")
			.replace(/\s+/g, " ")
			.trim()
	}

	async analyze(state: ProjectState): Promise<{ cuts: Array<AiCut>; flagged: boolean }> {
		const words = state.words
		if (!words) throw new Error("no transcript available")

		const numberedTranscript = words.map((w, i) => `[${i}]${w.text}`).join(" ")
		// headless Claude Code call on the CLI's subscription auth: no tools, no
		// settings/CLAUDE.md context, transcript over stdin (arg length limits)
		let result
		try {
			result = await run(
				serverConfig.claudeBin,
				["-p", "--model", "claude-opus-5", "--output-format", "json", "--tools", "", "--setting-sources", "", "--system-prompt", EDIT_POLICY],
				numberedTranscript,
			)
		} catch (err) {
			const message = (err as NodeJS.ErrnoException).code === "ENOENT" ? "claude CLI not found on this machine" : (err as Error).message
			throw new Error(message)
		}
		const envelope = JSON.parse(result.stdout) as { is_error: boolean; result: string }
		if (envelope.is_error) throw new Error(`claude CLI failed: ${envelope.result.slice(0, 500)}`)
		const text = envelope.result
			.trim()
			.replace(/^```(?:json)?\s*/, "")
			.replace(/```\s*$/, "")
		const parsed = cutListSchema.safeParse(JSON.parse(text))
		if (!parsed.success) throw new Error("model returned JSON that doesn't match the cut schema")

		// validation: bounds, echo check (the hallucination guard), sort, merge overlaps
		const valid = parsed.data.cuts.filter((c) => {
			if (!(c.first_word >= 0 && c.first_word <= c.last_word && c.last_word < words.length)) return false
			const actual = words
				.slice(c.first_word, c.last_word + 1)
				.map((w) => w.text)
				.join(" ")
			return this.normalizeForEcho(c.text) === this.normalizeForEcho(actual)
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

	private sanitizeCuts(raw: Array<Span>, duration: number): Array<Span> {
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

	async renderExport(id: string, cuts: Array<Span>) {
		const dir = this.dirOf(id)
		const state = this.readState(id)
		const source = this.sourceOf(id)
		if (!state || !source) throw new Error("project missing")

		const out = this.exportFileOf(id)
		const merged = this.sanitizeCuts(cuts, state.duration)
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
		// a filter script file: inline -filter_complex args overflow with many segments
		const filterFile = path.join(dir, "filter.txt")
		fs.writeFileSync(filterFile, lines.join("\n"))

		const args = ["-y", "-i", source, "-filter_complex_script", filterFile, "-map", "[vout]"]
		if (withAudio) args.push("-map", "[aout]")
		args.push("-c:v", "libx264", "-preset", "veryfast", "-crf", "20")
		if (withAudio) args.push("-c:a", "aac", "-b:a", "192k")
		args.push("-movflags", "+faststart", out)
		await run("ffmpeg", args)
	}
}

export const videoAgentService = new VideoAgentService()
