import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { useTRPC } from "#/integrations/trpc/react"
import { ReviewCard } from "#/components/ReviewCard"

export const Route = createFileRoute("/")({
	component: HomePage,
	loader: async ({ context }) => {
		await context.queryClient.prefetchQuery(context.trpc.cards.dueToday.queryOptions())
	},
})

function HomePage() {
	const trpc = useTRPC()
	const { data, isLoading } = useQuery(trpc.cards.dueToday.queryOptions())
	const [surprise, setSurprise] = useState(false)
	const surpriseQuery = useQuery({
		...trpc.cards.surprise.queryOptions({ n: 6 }),
		enabled: surprise,
	})

	if (isLoading) return <div className="text-muted-foreground">Loading…</div>

	const due = data?.due ?? []
	const random = data?.random ?? []
	const total = due.length + random.length

	return (
		<div className="space-y-10">
			<header className="flex items-center justify-between gap-4 flex-wrap">
				<div>
					<h1 className="text-3xl font-semibold tracking-tight">Today</h1>
					<p className="text-muted-foreground text-sm mt-1">
						{total === 0
							? "No cards due. Add one or try Surprise me."
							: `${due.length} due · ${random.length} bonus`}
					</p>
				</div>
				<div className="flex gap-2">
					<button
						onClick={() => setSurprise((s) => !s)}
						className="rounded-md border border-border bg-card hover:bg-muted px-3 py-2 text-sm transition"
					>
						{surprise ? "Hide surprise" : "Surprise me"}
					</button>
					<Link
						to="/cards/new"
						className="rounded-md bg-sage hover:opacity-90 px-3 py-2 text-sm font-medium text-white transition"
					>
						New card
					</Link>
				</div>
			</header>

			{total === 0 && !surprise && (
				<div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
					Nothing scheduled.{" "}
					<Link to="/cards/new" className="text-sage hover:underline">
						Create your first card
					</Link>
					.
				</div>
			)}

			{due.length > 0 && (
				<section className="space-y-4">
					<h2 className="text-xs uppercase tracking-wider text-muted-foreground">Scheduled</h2>
					<div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
						{due.map((card) => (
							<ReviewCard key={card.id} card={card} />
						))}
					</div>
				</section>
			)}

			{random.length > 0 && (
				<section className="space-y-4">
					<h2 className="text-xs uppercase tracking-wider text-muted-foreground">Random bonus</h2>
					<div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
						{random.map((card) => (
							<ReviewCard key={card.id} card={card} />
						))}
					</div>
				</section>
			)}

			{surprise && (
				<section className="space-y-4">
					<h2 className="text-xs uppercase tracking-wider text-muted-foreground">Surprise</h2>
					<div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
						{surpriseQuery.data?.map((card) => <ReviewCard key={card.id} card={card} />)}
					</div>
				</section>
			)}
		</div>
	)
}
