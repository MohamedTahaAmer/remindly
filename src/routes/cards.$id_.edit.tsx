import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { useTRPC } from "#/integrations/trpc/react"
import { parseInlineMarkdown, parseMarkdown } from "#/lib/markdown"

export const Route = createFileRoute("/cards/$id_/edit")({
	component: EditCard,
	loader: async ({ context, params }) => {
		await context.queryClient.prefetchQuery(context.trpc.cards.get.queryOptions({ id: Number(params.id) }))
	},
})

const fieldBase =
	"w-full bg-transparent border-0 border-b border-border focus:border-sage focus:outline-none focus:ring-0 px-0 py-2 text-foreground placeholder:text-muted-foreground/60 transition-colors field-sizing-content user-invalid:border-coral"

function EditCard() {
	const { id } = Route.useParams()
	const numId = Number(id)
	const trpc = useTRPC()
	const router = useRouter()
	const { data: card } = useQuery(trpc.cards.get.queryOptions({ id: numId }))

	const [front, setFront] = useState("")
	const [back, setBack] = useState("")
	const [details, setDetails] = useState("")
	const [detailsHtml, setDetailsHtml] = useState("")
	const deleteDialogRef = useRef<HTMLDialogElement>(null)

	useEffect(() => {
		if (!card) return
		setFront(card.front)
		setBack(card.back)
		setDetails(card.detailsMarkdown ?? "")
	}, [card])

	useEffect(() => {
		let cancelled = false
		if (!details.trim()) {
			setDetailsHtml("")
			return
		}
		const t = setTimeout(async () => {
			const html = await parseMarkdown(details)
			if (!cancelled) setDetailsHtml(html)
		}, 200)
		return () => {
			cancelled = true
			clearTimeout(t)
		}
	}, [details])

	const update = useMutation({
		...trpc.cards.update.mutationOptions(),
		onSuccess: () => router.navigate({ to: "/cards/$id", params: { id } }),
	})

	const del = useMutation({
		...trpc.cards.delete.mutationOptions(),
		onSuccess: () => router.navigate({ to: "/cards" }),
	})

	if (!card) return <div className="text-muted-foreground italic font-serif">Loading…</div>

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault()
				update.mutate({ id: numId, front, back, detailsMarkdown: details.trim() || null })
			}}
			className="relative left-1/2 right-1/2 -mx-[50vw] w-screen px-10 min-h-[calc(100vh-8rem)] flex flex-col gap-8"
		>
			<header className="flex items-end justify-between gap-4 shrink-0 border-b border-border pb-5">
				<div>
					<div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-mono">Revising № {card.id}</div>
					<h1 className="font-serif text-3xl tracking-tight mt-1">
						Edit card<span className="text-sage italic font-normal">.</span>
					</h1>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => router.history.back()}
						className="rounded-full px-5 py-2.5 text-sm text-muted-foreground hover:text-foreground transition"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={update.isPending}
						className="rounded-full bg-sage hover:bg-sage/90 disabled:opacity-50 px-6 py-2.5 text-sm text-white font-medium transition shadow-sm shadow-sage/30"
					>
						{update.isPending ? "Saving…" : "Save →"}
					</button>
				</div>
			</header>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 flex-1 min-h-0">
				<div className="space-y-8 overflow-y-auto pr-2">
					<label className="block">
						<div className="text-[11px] uppercase tracking-[0.2em] font-mono text-muted-foreground mb-2">The prompt</div>
						<input
							value={front}
							onChange={(e) => setFront(e.target.value)}
							required
							className={`${fieldBase} font-serif text-2xl leading-snug`}
						/>
					</label>

					<label className="block">
						<div className="text-[11px] uppercase tracking-[0.2em] font-mono text-muted-foreground mb-2">The answer</div>
						<textarea
							value={back}
							onChange={(e) => setBack(e.target.value)}
							required
							rows={3}
							className={`${fieldBase} font-serif text-lg`}
						/>
					</label>

					<label className="block">
						<div className="text-[11px] uppercase tracking-[0.2em] font-mono text-muted-foreground mb-2">The lesson</div>
						<textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={16} className={`${fieldBase} font-mono text-sm`} />
					</label>

					<section className="mt-12 pt-6 border-t border-coral/30">
						<div className="text-[11px] uppercase tracking-[0.2em] font-mono text-coral mb-2">Danger zone</div>
						<div className="flex items-center justify-between gap-4">
							<p className="text-sm text-muted-foreground italic font-serif">
								Removes this card and its full review history. There is no undo.
							</p>
							<button
								type="button"
								onClick={() => deleteDialogRef.current?.showModal()}
								className="shrink-0 rounded-full border border-coral text-coral hover:bg-coral hover:text-white px-4 py-2 text-sm transition"
							>
								Delete card
							</button>
						</div>
					</section>
				</div>

				<dialog
					ref={deleteDialogRef}
					{...{ closedby: "any" }}
					className="m-auto rounded-xl border border-border bg-card text-foreground p-6 max-w-sm shadow-xl backdrop:bg-black/40"
				>
					<h2 className="font-serif text-2xl">Delete this card?</h2>
					<p className="text-sm text-muted-foreground mt-2 italic font-serif">This will remove the card and its review history.</p>
					<div className="flex justify-end gap-2 mt-5">
						<button
							type="button"
							onClick={() => deleteDialogRef.current?.close()}
							className="rounded-full px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground transition"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={() => {
								deleteDialogRef.current?.close()
								del.mutate({ id: numId })
							}}
							className="rounded-full bg-coral hover:opacity-90 px-4 py-1.5 text-sm font-medium text-white transition"
						>
							Delete
						</button>
					</div>
				</dialog>

				<aside className="overflow-y-auto">
					<div className="sticky top-0 -mt-2 pt-2 pb-3 bg-background/80 backdrop-blur z-[1]">
						<div className="text-[11px] uppercase tracking-[0.2em] font-mono text-muted-foreground">Live preview · how the page will read</div>
					</div>
					<article className="max-w-2xl">
						<div className="relative pl-8 border-l-2 border-sage/40 mb-10">
							<div className="absolute -left-2 top-0 w-3 h-3 rounded-full bg-sage" />
							<h2
								className="font-serif text-4xl leading-[1.1] tracking-tight [overflow-wrap:anywhere] [&_code]:bg-muted [&_code]:px-2 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-[0.85em]"
								dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(front || " ") }}
							/>
						</div>
						<div className="mb-10">
							<div className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground mb-3">Answer</div>
							<p className="font-serif text-xl leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">{back}</p>
						</div>
						{detailsHtml ? (
							<section className="border-t border-border pt-8">
								<div className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-4">The lesson</div>
								<div className="prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: detailsHtml }} />
							</section>
						) : (
							<div className="border-t border-border pt-8 text-muted-foreground italic font-serif text-sm">No further notes for this card.</div>
						)}
					</article>
				</aside>
			</div>
		</form>
	)
}
