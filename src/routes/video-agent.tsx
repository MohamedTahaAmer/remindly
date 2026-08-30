import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Download, Loader2, Pause, Play, Scissors, Sparkles, Trash2, Upload, X } from "lucide-react"
import { Button } from "#/components/ui/button"
import { Switch } from "#/components/ui/switch"
import { useTRPC } from "#/integrations/trpc/react"
import { trpcClient } from "#/integrations/tanstack-query/root-provider"
import { cn } from "#/lib/utils"
import type { AiCut, ProjectState, Span, Word } from "#/server/modules/video-agent/schema/video-agent.schema"

export const Route = createFileRoute("/video-agent")({
	component: VideoAgent,
	ssr: false,
})

// Only the byte streams stay on raw HTTP (upload, <video> source, download);
// everything JSON-shaped goes through tRPC.
const API = "/api/video-agent"
const FILLER_RE = /^(u+m+|u+h+|er+m*|hm+m*|mhm+)[.,!?;:]*$/i

type CutKind = "silence" | "filler" | "ai"
type Cut = { id: string; kind: CutKind; start: number; end: number; label: string; enabled: boolean; firstWord?: number; lastWord?: number }

function formatTime(seconds: number): string {
	const s = Math.max(0, Math.floor(seconds))
	return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

function mergeSpans(spans: Array<Span>): Array<Span> {
	const sorted = [...spans].sort((a, b) => a.start - b.start)
	const merged: Array<Span> = []
	for (const span of sorted) {
		const prev = merged.at(-1)
		if (prev && span.start <= prev.end) prev.end = Math.max(prev.end, span.end)
		else merged.push({ ...span })
	}
	return merged
}

function aiCutToCut(c: AiCut, i: number, enabled: boolean): Cut {
	return {
		id: `ai-${i}`,
		kind: "ai",
		start: c.start,
		end: c.end,
		label: `${c.reason.replaceAll("_", " ")}: "${c.text}"`,
		enabled,
		firstWord: c.firstWord,
		lastWord: c.lastWord,
	}
}

function buildCuts(state: ProjectState): Array<Cut> {
	const cuts: Array<Cut> = []
	state.silences.forEach((s, i) => {
		const start = s.start + 0.15
		const end = s.end - 0.15
		if (end - start >= 0.25) cuts.push({ id: `sil-${i}`, kind: "silence", start, end, label: `Silence ${(end - start).toFixed(1)}s`, enabled: false })
	})
	state.words?.forEach((w, i) => {
		if (FILLER_RE.test(w.text))
			cuts.push({ id: `fil-${i}`, kind: "filler", start: w.start - 0.04, end: w.end + 0.04, label: `"${w.text}"`, enabled: false, firstWord: i, lastWord: i })
	})
	state.analysis?.cuts.forEach((c, i) => cuts.push(aiCutToCut(c, i, !state.analysis?.flagged)))
	return cuts
}

const KIND_STYLES: Record<CutKind, { solid: string; ghost: string; word: string }> = {
	silence: { solid: "bg-amber-500/70", ghost: "border-amber-500/50", word: "text-amber-600 dark:text-amber-400" },
	filler: { solid: "bg-red-500/70", ghost: "border-red-500/50", word: "text-red-600 dark:text-red-400" },
	ai: { solid: "bg-violet-500/70", ghost: "border-violet-500/50", word: "text-violet-600 dark:text-violet-400" },
}

function VideoAgent() {
	const [selected, setSelected] = useState<string | null>(null)
	return selected === null ? <Library onOpen={setSelected} /> : <Project id={selected} onBack={() => setSelected(null)} />
}

// ── library: upload zone + project list ──

function Library({ onOpen }: { onOpen: (id: string) => void }) {
	const trpc = useTRPC()
	const queryClient = useQueryClient()
	const { data: projects = [] } = useQuery(trpc.videoAgent.list.queryOptions())
	const deleteProject = useMutation(
		trpc.videoAgent.delete.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries(trpc.videoAgent.list.queryFilter()),
		}),
	)
	const [progress, setProgress] = useState<number | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [dragging, setDragging] = useState(false)
	const fileInput = useRef<HTMLInputElement>(null)

	function upload(file: File) {
		setError(null)
		setProgress(0)
		const xhr = new XMLHttpRequest()
		xhr.open("POST", `${API}/upload?name=${encodeURIComponent(file.name)}`)
		xhr.upload.onprogress = (e) => {
			if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
		}
		xhr.onload = () => {
			setProgress(null)
			if (xhr.status === 200) onOpen(JSON.parse(xhr.responseText).id)
			else setError(JSON.parse(xhr.responseText).error ?? `upload failed (${xhr.status})`)
		}
		xhr.onerror = () => {
			setProgress(null)
			setError("upload failed")
		}
		xhr.send(file)
	}

	return (
		<div className="space-y-6">
			<h1 className="font-serif text-2xl">Video Agent</h1>
			<button
				type="button"
				onClick={() => fileInput.current?.click()}
				onDragOver={(e) => {
					e.preventDefault()
					setDragging(true)
				}}
				onDragLeave={() => setDragging(false)}
				onDrop={(e) => {
					e.preventDefault()
					setDragging(false)
					const file = e.dataTransfer.files.item(0)
					if (file) upload(file)
				}}
				disabled={progress !== null}
				className={cn(
					"w-full rounded-xl border-2 border-dashed border-border p-10 text-center text-muted-foreground transition-colors",
					dragging && "border-primary bg-accent",
					progress === null && "cursor-pointer hover:border-primary/50",
				)}
			>
				{progress !== null ? (
					<span className="inline-flex items-center gap-2">
						<Loader2 className="size-4 animate-spin" /> Uploading… {progress}%
					</span>
				) : (
					<span className="inline-flex items-center gap-2">
						<Upload className="size-4" /> Drop a video here, or click to pick one (mp4, webm, mov, mkv, m4v)
					</span>
				)}
			</button>
			<input
				ref={fileInput}
				type="file"
				accept="video/*"
				className="hidden"
				onChange={(e) => {
					const file = e.target.files?.[0]
					if (file) upload(file)
					e.target.value = ""
				}}
			/>
			{error !== null && <p className="text-sm text-destructive">{error}</p>}

			{projects.length > 0 && (
				<ul className="divide-y divide-border rounded-xl border border-border">
					{projects.map((p) => (
						<li key={p.id} className="flex items-center gap-3 px-4 py-3">
							<button type="button" onClick={() => onOpen(p.id)} className="flex-1 cursor-pointer text-left">
								<span className="text-foreground">{p.name}</span>
								<span className="ml-3 text-xs text-muted-foreground tabular-nums">
									{p.duration > 0 && formatTime(p.duration)} · {new Date(p.createdAt).toLocaleString()}
								</span>
							</button>
							<span
								className={cn(
									"rounded-full px-2 py-0.5 text-xs",
									p.status === "ready" && "bg-primary/10 text-primary",
									p.status === "processing" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
									p.status === "error" && "bg-destructive/10 text-destructive",
								)}
							>
								{p.status}
							</span>
							<Button variant="ghost" size="icon-sm" aria-label="Delete project" onClick={() => deleteProject.mutate({ id: p.id })}>
								<Trash2 />
							</Button>
						</li>
					))}
				</ul>
			)}
		</div>
	)
}

// ── project: poll while processing, then hand off to the editor ──

const STEP_LABELS: Array<[ProjectState["step"], string]> = [
	["saving", "Saving upload"],
	["probing", "Probing video"],
	["extracting-audio", "Extracting audio"],
	["detecting-silence", "Detecting silences"],
	["transcribing", "Transcribing"],
]

function Project({ id, onBack }: { id: string; onBack: () => void }) {
	const trpc = useTRPC()
	const { data: state, error } = useQuery(
		trpc.videoAgent.state.queryOptions({ id }, { refetchInterval: (query) => (query.state.data?.status === "processing" ? 1500 : false) }),
	)

	const back = (
		<Button variant="ghost" size="sm" onClick={onBack}>
			<ArrowLeft /> Library
		</Button>
	)

	if (error)
		return (
			<div className="space-y-4">
				{back}
				<p className="text-sm text-destructive">{error.message}</p>
			</div>
		)

	if (!state)
		return (
			<div className="space-y-4">
				{back}
				<Loader2 className="size-5 animate-spin text-muted-foreground" />
			</div>
		)

	if (state.status === "error")
		return (
			<div className="space-y-4">
				{back}
				<p className="text-sm text-destructive">Processing failed: {state.error}</p>
			</div>
		)

	if (state.status === "processing") {
		const current = STEP_LABELS.findIndex(([step]) => step === state.step)
		return (
			<div className="space-y-4">
				{back}
				<h2 className="font-serif text-xl">{state.name}</h2>
				<ol className="space-y-2">
					{STEP_LABELS.map(([step, label], i) => (
						<li
							key={step}
							className={cn(
								"flex items-center gap-2 text-sm",
								i < current && "text-muted-foreground",
								i === current && "text-foreground",
								i > current && "text-muted-foreground/50",
							)}
						>
							{i === current ? <Loader2 className="size-4 animate-spin" /> : <span className="inline-block size-4 text-center">{i < current ? "✓" : "·"}</span>}
							{label}
						</li>
					))}
				</ol>
			</div>
		)
	}

	return <Editor state={state} onBack={onBack} />
}

// ── editor: player + cut groups + timeline + transcript ──

function Editor({ state, onBack }: { state: ProjectState; onBack: () => void }) {
	const { id, duration } = state
	const trpc = useTRPC()
	const analyzeMutation = useMutation(trpc.videoAgent.analyze.mutationOptions())
	const startExportMutation = useMutation(trpc.videoAgent.startExport.mutationOptions())
	const videoRef = useRef<HTMLVideoElement>(null)
	const playheadRef = useRef<HTMLDivElement>(null)
	const [cuts, setCuts] = useState<Array<Cut>>(() => buildCuts(state))
	const [playing, setPlaying] = useState(false)
	const [time, setTime] = useState(0)
	const [skipCuts, setSkipCuts] = useState(true)
	const [exporting, setExporting] = useState(false)
	const [banner, setBanner] = useState<string | null>(null)
	const [transcriptBanner, setTranscriptBanner] = useState<string | null>(state.transcriptError ?? null)

	const enabledMerged = useMemo(() => mergeSpans(cuts.filter((c) => c.enabled)), [cuts])
	const savedTime = enabledMerged.reduce((sum, s) => sum + (s.end - s.start), 0)

	// word index → its cut, for transcript styling and click-to-toggle
	const wordCuts = useMemo(() => {
		const map = new Map<number, Cut>()
		for (const cut of cuts) {
			if (cut.firstWord === undefined || cut.lastWord === undefined) continue
			for (let i = cut.firstWord; i <= cut.lastWord; i++) if (!map.has(i)) map.set(i, cut)
		}
		return map
	}, [cuts])

	// refs so the rAF loop sees fresh values without re-registering
	const skipRef = useRef(skipCuts)
	skipRef.current = skipCuts
	const enabledRef = useRef(enabledMerged)
	enabledRef.current = enabledMerged

	// rAF drives the playhead + skip logic (timeupdate alone is too coarse);
	// React state (time) only updates on timeupdate to keep re-renders cheap
	useEffect(() => {
		let raf = 0
		const tick = () => {
			const video = videoRef.current
			if (video) {
				const t = video.currentTime
				if (playheadRef.current) playheadRef.current.style.left = `${(t / duration) * 100}%`
				if (!video.paused && skipRef.current) {
					const cut = enabledRef.current.find((c) => t >= c.start && t < c.end)
					if (cut) {
						if (cut.end + 0.01 >= duration) video.pause()
						else video.currentTime = cut.end + 0.01
					}
				}
			}
			raf = requestAnimationFrame(tick)
		}
		raf = requestAnimationFrame(tick)
		return () => cancelAnimationFrame(raf)
	}, [duration])

	function seek(t: number) {
		const video = videoRef.current
		if (!video) return
		video.currentTime = Math.max(0, Math.min(duration, t))
		setTime(video.currentTime)
	}

	function toggleCut(cutId: string) {
		setCuts((prev) => prev.map((c) => (c.id === cutId ? { ...c, enabled: !c.enabled } : c)))
	}

	function toggleKind(kind: CutKind) {
		setCuts((prev) => {
			const allOn = prev.filter((c) => c.kind === kind).every((c) => c.enabled)
			return prev.map((c) => (c.kind === kind ? { ...c, enabled: !allOn } : c))
		})
	}

	async function findMistakes() {
		setBanner(null)
		try {
			const { cuts: aiCuts, flagged } = await analyzeMutation.mutateAsync({ id })
			setCuts((prev) => [...prev.filter((c) => c.kind !== "ai"), ...aiCuts.map((c, i) => aiCutToCut(c, i, !flagged))])
			if (flagged) setBanner("AI wants to cut >40% of the video — review the violet cuts before enabling them.")
			else if (aiCuts.length === 0) setBanner("AI found no mistakes to cut.")
		} catch (err) {
			setBanner((err as Error).message)
		}
	}

	async function exportVideo() {
		setExporting(true)
		setBanner(null)
		try {
			await startExportMutation.mutateAsync({ id, cuts: enabledMerged })
			for (;;) {
				await new Promise((resolve) => setTimeout(resolve, 1500))
				const next = await trpcClient.videoAgent.state.query({ id })
				if (next.export.status === "ready") {
					window.location.href = `${API}/${id}/export`
					break
				}
				if (next.export.status === "error") throw new Error(next.export.error ?? "render failed")
			}
		} catch (err) {
			setBanner((err as Error).message)
		} finally {
			setExporting(false)
		}
	}

	const counts = { silence: 0, filler: 0, ai: 0 } as Record<CutKind, number>
	const active = { silence: 0, filler: 0, ai: 0 } as Record<CutKind, number>
	for (const cut of cuts) {
		counts[cut.kind]++
		if (cut.enabled) active[cut.kind]++
	}

	const currentWord = useMemo(() => state.words?.findIndex((w) => time >= w.start && time < w.end) ?? -1, [state.words, time])

	// transcript items: words interleaved with long-silence chips, in time order
	const transcriptItems = useMemo(() => {
		if (!state.words) return []
		const items: Array<{ type: "word"; index: number; word: Word } | { type: "silence"; cut: Cut | undefined; start: number }> = state.words.map(
			(word, index) => ({ type: "word" as const, index, word }),
		)
		state.silences.forEach((s, i) => {
			if (s.end - s.start < 0.7) return
			const cut = cuts.find((c) => c.id === `sil-${i}`)
			items.push({ type: "silence", cut, start: s.start })
		})
		return items.sort((a, b) => (a.type === "word" ? a.word.start : a.start) - (b.type === "word" ? b.word.start : b.start))
	}, [state.words, state.silences, cuts])

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-3">
				<Button variant="ghost" size="sm" onClick={onBack}>
					<ArrowLeft /> Library
				</Button>
				<h2 className="font-serif text-xl truncate">{state.name}</h2>
			</div>

			{transcriptBanner !== null && (
				<div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
					<span className="flex-1">No transcript: {transcriptBanner} — silence removal still works.</span>
					<Button variant="ghost" size="icon-xs" aria-label="Dismiss" onClick={() => setTranscriptBanner(null)}>
						<X />
					</Button>
				</div>
			)}
			{banner !== null && (
				<div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm">
					<span className="flex-1">{banner}</span>
					<Button variant="ghost" size="icon-xs" aria-label="Dismiss" onClick={() => setBanner(null)}>
						<X />
					</Button>
				</div>
			)}

			{/* player */}
			<div className="overflow-hidden rounded-xl border border-border bg-black">
				<video
					ref={videoRef}
					src={`${API}/${id}/video`}
					playsInline
					className="mx-auto max-h-[50vh]"
					onPlay={() => setPlaying(true)}
					onPause={() => setPlaying(false)}
					onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
				/>
			</div>
			<div className="flex flex-wrap items-center gap-4">
				<Button
					variant="outline"
					size="icon-sm"
					aria-label={playing ? "Pause" : "Play"}
					onClick={() => {
						const video = videoRef.current
						if (!video) return
						if (video.paused) video.play()
						else video.pause()
					}}
				>
					{playing ? <Pause /> : <Play />}
				</Button>
				<span className="text-sm text-muted-foreground tabular-nums">
					{formatTime(time)} / {formatTime(duration)}
				</span>
				<label className="flex items-center gap-2 text-sm text-muted-foreground">
					<Switch checked={skipCuts} onCheckedChange={setSkipCuts} size="sm" /> Skip cuts while playing
				</label>
				<span className="ml-auto text-sm text-muted-foreground tabular-nums">
					Edited: {formatTime(duration - savedTime)} {savedTime > 0 && `(saves ${formatTime(savedTime)})`}
				</span>
			</div>

			{/* cut groups + export */}
			<div className="flex flex-wrap items-center gap-2">
				<Button variant={active.silence > 0 ? "default" : "outline"} size="sm" disabled={counts.silence === 0} onClick={() => toggleKind("silence")}>
					<Scissors /> Silences ({counts.silence})
				</Button>
				<Button variant={active.filler > 0 ? "default" : "outline"} size="sm" disabled={counts.filler === 0} onClick={() => toggleKind("filler")}>
					<Scissors /> Fillers ({counts.filler})
				</Button>
				{counts.ai > 0 ? (
					<Button variant={active.ai > 0 ? "default" : "outline"} size="sm" onClick={() => toggleKind("ai")}>
						<Sparkles /> Mistakes ({counts.ai})
					</Button>
				) : (
					<Button variant="outline" size="sm" disabled={analyzeMutation.isPending || !state.words} onClick={findMistakes}>
						{analyzeMutation.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />} {analyzeMutation.isPending ? "Analyzing…" : "Find mistakes"}
					</Button>
				)}
				<Button size="sm" className="ml-auto" disabled={exporting} onClick={exportVideo}>
					{exporting ? <Loader2 className="animate-spin" /> : <Download />} {exporting ? "Rendering…" : "Export video"}
				</Button>
			</div>

			{/* timeline */}
			<div
				className="relative h-16 w-full cursor-pointer rounded-lg border border-border bg-muted"
				onClick={(e) => {
					const rect = e.currentTarget.getBoundingClientRect()
					seek(((e.clientX - rect.left) / rect.width) * duration)
				}}
			>
				{cuts.map((cut) => (
					<button
						key={cut.id}
						type="button"
						title={`${cut.label} · ${(cut.end - cut.start).toFixed(1)}s`}
						onClick={(e) => {
							e.stopPropagation()
							toggleCut(cut.id)
						}}
						className={cn(
							"absolute top-1 bottom-1 min-w-[2px] cursor-pointer rounded-sm",
							cut.enabled ? KIND_STYLES[cut.kind].solid : `border ${KIND_STYLES[cut.kind].ghost} bg-transparent opacity-60`,
						)}
						style={{ left: `${(cut.start / duration) * 100}%`, width: `${((cut.end - cut.start) / duration) * 100}%` }}
					/>
				))}
				<div ref={playheadRef} className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-foreground" style={{ left: "0%" }} />
			</div>

			{/* transcript */}
			{state.words && state.words.length > 0 && (
				<div className="max-h-80 overflow-y-auto rounded-xl border border-border p-4 leading-8">
					{transcriptItems.map((item) => {
						if (item.type === "silence") {
							if (!item.cut) return null
							const cut = item.cut
							return (
								<button
									key={cut.id}
									type="button"
									title={`${cut.label} — click to toggle`}
									onClick={() => toggleCut(cut.id)}
									className={cn(
										"mx-0.5 cursor-pointer rounded px-1.5 text-sm align-middle",
										cut.enabled ? "bg-amber-500/30 line-through opacity-60" : "bg-muted text-muted-foreground",
									)}
								>
									···
								</button>
							)
						}
						const { index, word } = item
						const cut = wordCuts.get(index)
						const isFillerWord = cut?.kind === "filler"
						return (
							<span
								key={index}
								onClick={() => (cut ? toggleCut(cut.id) : seek(word.start))}
								className={cn(
									"cursor-pointer rounded px-0.5 hover:bg-accent",
									index === currentWord && "bg-primary/20",
									isFillerWord && "bg-red-500/10",
									cut?.enabled && `line-through opacity-50 ${KIND_STYLES[cut.kind].word}`,
								)}
							>
								{word.text}{" "}
							</span>
						)
					})}
				</div>
			)}
		</div>
	)
}
