import { createFileRoute, Link } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import { useState } from "react"
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
	const [revealed, setRevealed] = useState(false)

	return (
		<article className="max-w-3xl mx-auto">
			<header className="flex items-center justify-between mb-12">
				<Link to="/cards" className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors">
					← The index
				</Link>
				<div className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
					Step <span className="text-sage">{card.intervalIndex}</span> · scheduled {new Date(card.scheduledFor).toLocaleDateString()}
				</div>
			</header>

			<div className="relative pl-8 border-l-2 border-sage/40 mb-12">
				<div className="absolute -left-2 top-0 w-3 h-3 rounded-full bg-sage" />
				<h1
					className="font-serif text-4xl md:text-5xl leading-[1.1] tracking-tight [overflow-wrap:anywhere] [&_code]:bg-muted [&_code]:px-2 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-[0.85em]"
					style={{ viewTransitionName: `card-title-${card.id}`, fontVariationSettings: '"opsz" 144' }}
					dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(card.front) }}
				/>
			</div>

			<details
				open={revealed}
				onToggle={(e) => setRevealed((e.target as HTMLDetailsElement).open)}
				className="group mb-14 [&_summary::-webkit-details-marker]:hidden"
			>
				<summary className="cursor-pointer select-none flex items-center gap-3 text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors">
					<span className="inline-block w-6 border-t border-current" />
					<span>{revealed ? "Hide answer" : "Reveal answer"}</span>
				</summary>
				<div className="mt-6 font-serif text-xl leading-relaxed text-foreground whitespace-pre-wrap [overflow-wrap:anywhere]">
					{card.back}
				</div>
			</details>

			{detailsHtml ? (
				<section className="border-t border-border pt-10">
					<div className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-6">The lesson</div>
					<div className="prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: detailsHtml }} />
				</section>
			) : (
				<div className="border-t border-border pt-10 text-muted-foreground italic font-serif text-sm">No further notes for this card.</div>
			)}

			<footer className="mt-16 pt-6 border-t border-border flex items-center justify-between text-xs font-mono uppercase tracking-[0.2em]">
				<Link to="/cards/$id/edit" params={{ id }} className="text-muted-foreground hover:text-foreground transition-colors">
					Edit ↗
				</Link>
				<span className="text-muted-foreground/60">№ {card.id}</span>
			</footer>
		</article>
	)
}
