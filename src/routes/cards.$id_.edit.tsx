import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useTRPC } from "#/integrations/trpc/react"
import { parseInlineMarkdown, parseMarkdown } from "#/lib/markdown"

export const Route = createFileRoute("/cards/$id_/edit")({
	component: EditCard,
	loader: async ({ context, params }) => {
		await context.queryClient.prefetchQuery(context.trpc.cards.get.queryOptions({ id: Number(params.id) }))
	},
})

const fieldClass =
	"w-full rounded-md bg-input border border-border px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sage field-sizing-content user-invalid:border-coral user-invalid:focus:ring-coral"

const titleClass =
	"text-3xl font-semibold tracking-tight [overflow-wrap:anywhere] [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-[0.9em]"

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

	useEffect(() => {
		if (!card) return
		setFront(card.front)
		setBack(card.back)
		setDetails(card.detailsMarkdown ?? "")
	}, [card])

	// Debounced markdown -> html for the live preview.
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

	if (!card) return <div className="text-muted-foreground">Loading…</div>

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault()
				update.mutate({ id: numId, front, back, detailsMarkdown: details.trim() || null })
			}}
			className="relative left-1/2 right-1/2 -mx-[50vw] w-screen px-10 h-[calc(100vh-8rem)] flex flex-col gap-4 overflow-hidden"
		>
			<div className="flex items-center justify-between gap-4 shrink-0">
				<h1 className="text-2xl font-semibold tracking-tight">Edit card</h1>
				<div className="flex gap-2">
					<button
						type="button"
						onClick={() => router.history.back()}
						className="rounded-md border border-border hover:bg-muted px-4 py-2 text-foreground transition"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={() => {
							if (confirm("Delete this card?")) del.mutate({ id: numId })
						}}
						className="rounded-md border border-coral text-coral hover:bg-coral/10 px-4 py-2 transition"
					>
						Delete
					</button>
					<button
						type="submit"
						disabled={update.isPending}
						className="rounded-md bg-sage hover:opacity-90 disabled:opacity-50 px-4 py-2 text-white font-medium transition"
					>
						{update.isPending ? "Saving…" : "Save"}
					</button>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
				<div className="space-y-4 overflow-y-auto pr-2 flex flex-col">
					<label className="block">
						<div className="text-sm text-muted-foreground mb-1.5">Title (front, markdown)</div>
						<input value={front} onChange={(e) => setFront(e.target.value)} required className={fieldClass} />
					</label>

					<label className="block">
						<div className="text-sm text-muted-foreground mb-1.5">Back</div>
						<textarea value={back} onChange={(e) => setBack(e.target.value)} required rows={4} className={fieldClass} />
					</label>

					<label className="flex flex-col flex-1 min-h-0">
						<div className="text-sm text-muted-foreground mb-1.5">Details (markdown)</div>
						<textarea value={details} onChange={(e) => setDetails(e.target.value)} className={`${fieldClass} font-mono text-sm flex-1 resize-none`} />
					</label>
				</div>

				<div className="overflow-y-auto rounded-xl border border-border bg-card p-6 space-y-6">
					<div className="text-[10px] uppercase tracking-wider text-muted-foreground">Preview</div>
					<div>
						<h2 className={titleClass} dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(front || " ") }} />
						<p className="text-muted-foreground mt-2 whitespace-pre-wrap">{back}</p>
					</div>
					{detailsHtml ? (
						<div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: detailsHtml }} />
					) : (
						<div className="text-muted-foreground text-sm">No details.</div>
					)}
				</div>
			</div>
		</form>
	)
}
