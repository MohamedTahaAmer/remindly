import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useTRPC } from "#/integrations/trpc/react"

export const Route = createFileRoute("/cards/")({
	component: CardsList,
	loader: async ({ context }) => {
		await context.queryClient.prefetchQuery(context.trpc.cards.list.queryOptions())
	},
})

function CardsList() {
	const trpc = useTRPC()
	const { data } = useQuery(trpc.cards.list.queryOptions())

	return (
		<div className="space-y-6">
			<header className="flex items-center justify-between">
				<h1 className="text-3xl font-semibold tracking-tight">All cards</h1>
				<Link to="/cards/new" className="rounded-md bg-sage hover:opacity-90 px-3 py-2 text-sm font-medium text-white transition">
					New card
				</Link>
			</header>

			{!data?.length && <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">No cards yet.</div>}

			<ul className="divide-y divide-border rounded-xl border border-border bg-card">
				{data?.map((c) => (
					<li key={c.id} className="p-4 flex items-center justify-between gap-4 [content-visibility:auto] [contain-intrinsic-size:auto_4rem]">
						<div className="min-w-0">
							<div className="truncate font-medium" style={{ viewTransitionName: `card-title-${c.id}` }}>
								{c.front}
							</div>
							<div className="text-xs text-muted-foreground mt-1">
								Step {c.intervalIndex} · due {new Date(c.scheduledFor).toLocaleDateString()}
							</div>
						</div>
						<div className="flex gap-3 text-sm shrink-0">
							{c.detailsMarkdown && (
								<Link to="/cards/$id" params={{ id: String(c.id) }} viewTransition className="text-sage hover:underline">
									View
								</Link>
							)}
							<Link to="/cards/$id/edit" params={{ id: String(c.id) }} className="text-muted-foreground hover:text-foreground">
								Edit
							</Link>
						</div>
					</li>
				))}
			</ul>
		</div>
	)
}
