import { createFileRoute, Link } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import { useTRPC } from "#/integrations/trpc/react"
import { parseInlineMarkdown, parseMarkdown } from "#/lib/markdown"

export const Route = createFileRoute("/cards/$id")({
	component: CardDetail,
	loader: async ({ context, params }) => {
		const card = await context.queryClient.fetchQuery(context.trpc.cards.get.queryOptions({ id: Number(params.id) }))
		const detailsHtml = card.detailsMarkdown ? await parseMarkdown(card.detailsMarkdown) : null
		return { detailsHtml }
	},
})

function CardDetail() {
	const { id } = Route.useParams()
	const { detailsHtml } = Route.useLoaderData()
	const trpc = useTRPC()
	const { data: card } = useSuspenseQuery(trpc.cards.get.queryOptions({ id: Number(id) }))

	return (
		<article className="space-y-6 max-w-3xl">
			<header className="flex items-start justify-between gap-4">
				<div>
					<h1
						className="text-3xl font-semibold tracking-tight [overflow-wrap:anywhere] [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-[0.9em]"
						style={{ viewTransitionName: `card-title-${card.id}` }}
						dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(card.front) }}
					/>
					<p className="text-muted-foreground mt-2 whitespace-pre-wrap">{card.back}</p>
				</div>
				<Link to="/cards/$id/edit" params={{ id }} className="text-sm text-muted-foreground hover:text-foreground shrink-0">
					Edit
				</Link>
			</header>

			{detailsHtml ? (
				<div className="rounded-xl border border-border bg-card p-6">
					<div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: detailsHtml }} />
				</div>
			) : (
				<div className="text-muted-foreground text-sm">No details for this card.</div>
			)}
		</article>
	)
}
