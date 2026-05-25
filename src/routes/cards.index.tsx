import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useTRPC } from "#/integrations/trpc/react"
import { parseInlineMarkdown } from "#/lib/markdown"

export const Route = createFileRoute("/cards/")({
	component: CardsList,
	loader: async ({ context }) => {
		await context.queryClient.prefetchQuery(context.trpc.cards.list.queryOptions())
	},
})

type Card = { id: number; front: string; back: string; detailsMarkdown: string | null; intervalIndex: number; scheduledFor: string | Date }

function startOfDay(d: Date) {
	const x = new Date(d)
	x.setHours(0, 0, 0, 0)
	return x
}

function bucketOf(scheduledFor: string | Date): "overdue" | "today" | "soon" | "later" {
	const today = startOfDay(new Date()).getTime()
	const due = startOfDay(new Date(scheduledFor)).getTime()
	const day = 86400000
	if (due < today) return "overdue"
	if (due === today) return "today"
	if (due - today <= 7 * day) return "soon"
	return "later"
}

function relativeDue(scheduledFor: string | Date) {
	const today = startOfDay(new Date()).getTime()
	const due = startOfDay(new Date(scheduledFor)).getTime()
	const day = 86400000
	const diff = Math.round((due - today) / day)
	if (diff < -1) return `${-diff}d overdue`
	if (diff === -1) return "yesterday"
	if (diff === 0) return "today"
	if (diff === 1) return "tomorrow"
	if (diff <= 7) return `in ${diff}d`
	return new Date(scheduledFor).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

const BUCKETS: { key: "overdue" | "today" | "soon" | "later"; label: string; accent: string }[] = [
	{ key: "overdue", label: "Overdue", accent: "text-coral" },
	{ key: "today", label: "Today", accent: "text-sage" },
	{ key: "soon", label: "This week", accent: "text-foreground" },
	{ key: "later", label: "Later", accent: "text-muted-foreground" },
]

function CardsList() {
	const trpc = useTRPC()
	const { data } = useQuery(trpc.cards.list.queryOptions())

	const grouped: Record<string, Card[]> = { overdue: [], today: [], soon: [], later: [] }
	for (const c of (data ?? []) as Card[]) grouped[bucketOf(c.scheduledFor)].push(c)

	return (
		<div className="space-y-12">
			<header className="flex items-end justify-between gap-4 border-b border-border pb-6">
				<div>
					<div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-mono">The index</div>
					<h1 className="font-serif text-5xl tracking-tight mt-1">
						All cards
						<span className="text-sage italic font-normal">.</span>
					</h1>
				</div>
				<Link
					to="/cards/new"
					className="rounded-full bg-sage hover:bg-sage/90 px-5 py-2.5 text-sm font-medium text-white transition shadow-sm shadow-sage/30"
				>
					New card →
				</Link>
			</header>

			{!data?.length && (
				<div className="py-24 text-center">
					<p className="font-serif text-2xl italic text-muted-foreground">No cards yet.</p>
					<p className="text-sm text-muted-foreground mt-2">
						Begin your library —{" "}
						<Link to="/cards/new" className="text-sage underline underline-offset-4 decoration-sage/40 hover:decoration-sage">
							write the first lesson
						</Link>
						.
					</p>
				</div>
			)}

			{BUCKETS.map(({ key, label, accent }) => {
				const items = grouped[key]
				if (!items.length) return null
				return (
					<section key={key}>
						<h2 className={`text-[11px] uppercase tracking-[0.2em] font-mono mb-4 ${accent}`}>
							{label} <span className="text-muted-foreground/60">· {items.length}</span>
						</h2>
						<ul className="divide-y divide-border/60">
							{items.map((c) => (
								<li
									key={c.id}
									className="group grid grid-cols-[8rem_1fr_auto] gap-6 items-baseline py-4 [content-visibility:auto] [contain-intrinsic-size:auto_4rem]"
								>
									<div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">
										<span className={key === "overdue" ? "text-coral" : key === "today" ? "text-sage" : ""}>{relativeDue(c.scheduledFor)}</span>
										<span className="text-muted-foreground/60"> · step {c.intervalIndex}</span>
									</div>
									<div className="min-w-0">
										<Link
											to={c.detailsMarkdown ? "/cards/$id" : "/cards/$id/edit"}
											params={{ id: String(c.id) }}
											viewTransition={!!c.detailsMarkdown}
											className="block font-serif text-xl leading-snug [overflow-wrap:anywhere] hover:text-sage transition-colors [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-[0.85em]"
											style={{ viewTransitionName: `card-title-${c.id}` }}
											dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(c.front) }}
										/>
									</div>
									<div className="flex gap-4 text-xs font-mono uppercase tracking-wider shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
										{c.detailsMarkdown && (
											<Link
												to="/cards/$id"
												params={{ id: String(c.id) }}
												viewTransition
												className="text-sage hover:underline underline-offset-4"
											>
												Read
											</Link>
										)}
										<Link to="/cards/$id/edit" params={{ id: String(c.id) }} className="text-muted-foreground hover:text-foreground">
											Edit
										</Link>
									</div>
								</li>
							))}
						</ul>
					</section>
				)
			})}
		</div>
	)
}
