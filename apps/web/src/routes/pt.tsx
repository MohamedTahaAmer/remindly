import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, Maximize2, Plus, Trash2 } from "lucide-react"
import { Button } from "#/components/ui/button"
import { useTRPC } from "#/integrations/trpc/react"
import { copyToClipboard } from "#/lib/clipboard"
import { confirmDelete } from "#/lib/forms"
import type { PastedText } from "#/server/modules/pasted-texts/dto/pasted-texts.dto"

export const Route = createFileRoute("/pt")({
	component: PasteTexts,
	ssr: false,
})

function PasteTexts() {
	const trpc = useTRPC()
	const queryClient = useQueryClient()
	const { data: texts = [] } = useQuery(trpc.pastedTexts.list.queryOptions())
	const invalidateList = () => queryClient.invalidateQueries(trpc.pastedTexts.list.queryFilter())
	const createText = useMutation(trpc.pastedTexts.create.mutationOptions({ onSuccess: invalidateList }))
	const deleteText = useMutation(trpc.pastedTexts.delete.mutationOptions({ onSuccess: invalidateList }))

	const [status, setStatus] = useState<string | null>(null)
	const [draft, setDraft] = useState("")
	const [copied, setCopied] = useState<number | null>(null)
	const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
	const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

	function flashStatus(text: string, ms = 3000) {
		if (statusTimer.current) clearTimeout(statusTimer.current)
		setStatus(text)
		statusTimer.current = setTimeout(() => setStatus(null), ms)
	}

	// keep the paste listener's closure pointing at the latest render's mutation
	const createRef = useRef(createText)
	createRef.current = createText

	useEffect(() => {
		// global watcher: Ctrl+V anywhere on the page saves the clipboard text
		async function onPaste(e: ClipboardEvent) {
			// pasting into the composer just fills it; the Save button saves
			if (e.target instanceof Element && e.target.closest("textarea, input")) return
			const text = e.clipboardData?.getData("text/plain") ?? ""
			if (text.trim().length === 0) return
			e.preventDefault()

			try {
				await createRef.current.mutateAsync({ text })
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

	async function saveDraft(e: React.FormEvent) {
		e.preventDefault()
		if (draft.trim().length === 0) return
		try {
			await createText.mutateAsync({ text: draft })
			setDraft("")
			flashStatus("Saved ✓")
		} catch {
			flashStatus("Save failed", 8000)
		}
	}

	async function copyText(item: PastedText) {
		await copyToClipboard(item.text)
		flashCopied(item.id)
	}

	return (
		<div className="space-y-6 sm:space-y-8">
			{/* the only way in on a phone (no Ctrl+V): long-press → Paste, or type */}
			<form onSubmit={saveDraft} className="flex items-end gap-2">
				<textarea
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					rows={1}
					placeholder="Type or paste text to save…"
					className="w-full min-h-11 max-h-[40dvh] field-sizing-content resize-none rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-mono placeholder:font-sans placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-sage"
				/>
				<Button type="submit" disabled={draft.trim().length === 0 || createText.isPending} className="h-11 shrink-0 bg-sage text-white hover:bg-sage/90 disabled:bg-muted disabled:text-muted-foreground">
					<Plus /> Save
				</Button>
			</form>

			{texts.length === 0 ? (
				<p className="text-sm text-muted-foreground/70 italic font-serif">Nothing here yet.</p>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
					{texts.map((item) => (
						<div key={item.id} className="relative group">
							<button
								type="button"
								onClick={() => copyText(item)}
								aria-label="Copy text"
								className="block w-full h-32 sm:h-48 cursor-pointer overflow-hidden rounded-lg border border-border bg-card p-3 text-left"
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
								className="absolute top-1 right-1 rounded-md bg-black/60 text-white p-1.5 transition hover:bg-black/80 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100"
							>
								<Maximize2 className="size-4 pointer-fine:size-7" />
							</a>
							<button
								type="button"
								onClick={() => confirmDelete("Delete this text?") && deleteText.mutate({ id: item.id })}
								aria-label="Delete text"
								className="absolute bottom-1 right-1 rounded-md bg-black/60 text-white p-1.5 transition hover:bg-red-600/90 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100"
							>
								<Trash2 className="size-4 pointer-fine:size-7" />
							</button>
						</div>
					))}
				</div>
			)}

			<div className="text-xs text-muted-foreground/60 select-none text-center">
				{status ?? (
					<>
						<span className="pointer-coarse:hidden">Ctrl+V anywhere on this page to save the text from your clipboard.</span>
						<span className="pointer-fine:hidden">Tap a card to copy its text.</span>
					</>
				)}
			</div>
		</div>
	)
}
