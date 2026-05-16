import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { marked } from "marked"
import { useTRPC } from "#/integrations/trpc/react"

export const Route = createFileRoute("/cards/$id")({
	component: CardDetail,
	loader: async ({ context, params }) => {
		await context.queryClient.prefetchQuery(
			context.trpc.cards.get.queryOptions({ id: Number(params.id) }),
		)
	},
})

function CardDetail() {
	const { id } = Route.useParams()
	const trpc = useTRPC()
	const { data: card, isLoading } = useQuery(trpc.cards.get.queryOptions({ id: Number(id) }))

	if (isLoading) return <div className="text-muted-foreground">Loading…</div>
	if (!card) return <div className="text-muted-foreground">Not found</div>

	const html = card.detailsMarkdown ? marked.parse(card.detailsMarkdown) : null

	return (
		<article className="space-y-6 max-w-3xl">
			<header className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-3xl font-semibold tracking-tight">{card.front}</h1>
					<p className="text-muted-foreground mt-2 whitespace-pre-wrap">{card.back}</p>
				</div>
				<Link to="/cards/$id/edit" params={{ id }} className="text-sm text-muted-foreground hover:text-foreground shrink-0">
					Edit
				</Link>
			</header>

			{html ? (
				<div className="rounded-xl border border-border bg-card p-6">
					<div
						className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-a:text-sage prose-strong:text-foreground prose-code:text-foreground prose-code:bg-muted prose-code:px-1 prose-code:rounded"
						dangerouslySetInnerHTML={{ __html: html as string }}
					/>
				</div>
			) : (
				<div className="text-muted-foreground text-sm">No details for this card.</div>
			)}
		</article>
	)
}
