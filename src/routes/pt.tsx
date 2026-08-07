import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"
import { Check, Maximize2, Trash2 } from "lucide-react"
import { copyToClipboard } from "#/lib/clipboard"

export const Route = createFileRoute("/pt")({
	component: PasteTexts,
	ssr: false,
})

type PastedText = { id: number; text: string; createdAt: string }

function PasteTexts() {
	const [texts, setTexts] = useState<Array<PastedText>>([])
	const [status, setStatus] = useState<string | null>(null)
	const [copied, setCopied] = useState<number | null>(null)
	const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
	const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

	async function refresh() {
		const res = await fetch("/api/pasted-texts")
		setTexts(await res.json())
	}

	function flashStatus(text: string, ms = 3000) {
		if (statusTimer.current) clearTimeout(statusTimer.current)
		setStatus(text)
		statusTimer.current = setTimeout(() => setStatus(null), ms)
	}

	useEffect(() => {
		refresh()

		// global watcher: Ctrl+V anywhere on the page saves the clipboard text
		async function onPaste(e: ClipboardEvent) {
			const text = e.clipboardData?.getData("text/plain") ?? ""
			if (text.trim().length === 0) return
			e.preventDefault()

			try {
				const res = await fetch("/api/pasted-texts", {
					method: "POST",
					headers: { "content-type": "text/plain; charset=utf-8" },
					body: text,
				})
				if (!res.ok) throw new Error(`save failed: ${res.status}`)
				await refresh()
				flashStatus("Saved ✓")
			} catch {
				flashStatus("Save failed", 8000)
			}
		}

		document.addEventListener("paste", onPaste)
		return () => document.removeEventListener("paste", onPaste)
	}, [])

	function flashCopied(id: number) {
		if (copiedTimer.current) clearTimeout(copiedTimer.current)
		setCopied(id)
		copiedTimer.current = setTimeout(() => setCopied(null), 1500)
	}

	async function copyText(item: PastedText) {
		await copyToClipboard(item.text)
		flashCopied(item.id)
	}

	async function deleteText(id: number) {
		const res = await fetch(`/pasted-texts/${id}`, { method: "DELETE" })
		if (res.ok) setTexts((prev) => prev.filter((t) => t.id !== id))
	}

	return (
		<div className="space-y-8">
			{texts.length === 0 ? (
				<p className="text-sm text-muted-foreground/70 italic font-serif">Nothing here yet.</p>
			) : (
				<div className="grid grid-cols-3 gap-3">
					{texts.map((item) => (
						<div key={item.id} className="relative group">
							<button
								type="button"
								onClick={() => copyText(item)}
								aria-label="Copy text"
								className="block w-full h-48 cursor-pointer overflow-hidden rounded-lg border border-border bg-card p-3 text-left"
							>
								<pre className="text-xs whitespace-pre-wrap break-words font-mono text-card-foreground">{item.text}</pre>
							</button>
							{copied === item.id && (
								<div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 pointer-events-none">
									<Check className="h-10 w-10 text-white" />
								</div>
							)}
							<a
								href={`/pasted-texts/${item.id}`}
								target="_blank"
								rel="noreferrer"
								aria-label="Open text in new tab"
								className="absolute top-1 right-1 rounded-md bg-black/60 text-white p-1.5 transition hover:bg-black/80 opacity-0 group-hover:opacity-100"
							>
								<Maximize2 className="h-7 w-7" />
							</a>
							<button
								type="button"
								onClick={() => deleteText(item.id)}
								aria-label="Delete text"
								className="absolute top-1 left-1 rounded-md bg-black/60 text-white p-1.5 transition hover:bg-red-600/90 opacity-0 group-hover:opacity-100"
							>
								<Trash2 className="h-7 w-7" />
							</button>
						</div>
					))}
				</div>
			)}

			<div className="text-xs text-muted-foreground/60 select-none text-center">
				{status ?? "Ctrl+V anywhere on this page to save the text from your clipboard."}
			</div>
		</div>
	)
}
