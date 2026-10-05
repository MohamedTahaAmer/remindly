import { Link, useRouter } from "@tanstack/react-router"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Dialog } from "radix-ui"
import { X } from "lucide-react"
import { useTRPC } from "#/integrations/trpc/react"
import { parseBlockMarkdown, parseInlineMarkdown } from "#/lib/markdown"
import { intervalDaysFor, nextIntervalIndex } from "#/lib/schedule"
import type { ReviewRating } from "@remindly/db/schema"

type Card = {
	id: number
	front: string
	back: string
	detailsMarkdown: string | null
	intervalIndex: number
}

const RATINGS: { rating: ReviewRating; label: string; tone: string }[] = [
	{ rating: "again", label: "Again", tone: "bg-coral text-white hover:opacity-90" },
	{ rating: "hard", label: "Hard", tone: "bg-yellow text-[#2d3a38] hover:opacity-90" },
	{ rating: "good", label: "Good", tone: "bg-sage text-white hover:opacity-90" },
	{ rating: "easy", label: "Easy", tone: "bg-pink text-[#2d3a38] hover:opacity-90" },
]

export function CardModal({ card, open, onOpenChange }: { card: Card; open: boolean; onOpenChange: (open: boolean) => void }) {
	const trpc = useTRPC()
	const router = useRouter()

	const detailsQuery = useQuery({
		...trpc.cards.details.queryOptions({ id: card.id }),
		enabled: open && !!card.detailsMarkdown,
	})

	const submit = useMutation({
		...trpc.review.submit.mutationOptions(),
		onSuccess: () => {
			onOpenChange(false)
			router.invalidate()
		},
	})

	const titleHtml = parseInlineMarkdown(card.front)

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
				{/* phones: bottom sheet (ratings within thumb reach); sm+: centered dialog */}
				<Dialog.Content className="fixed z-50 flex flex-col border border-border bg-card text-card-foreground shadow-xl inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[95vw] sm:max-w-3xl sm:max-h-[90vh] sm:rounded-xl sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=closed]:fade-out-0 sm:data-[state=open]:fade-in-0 sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95">
					<header className="flex items-start justify-between gap-4 p-4 sm:p-6 border-b border-border">
						<Dialog.Title asChild>
							<h2
								className="text-xl font-semibold tracking-tight [overflow-wrap:anywhere] [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-[0.9em]"
								dangerouslySetInnerHTML={{ __html: titleHtml }}
							/>
						</Dialog.Title>
						<Dialog.Close asChild>
							<button
								type="button"
								aria-label="Close"
								className="shrink-0 -m-1 rounded-md p-2 sm:p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition"
							>
								<X className="h-5 w-5" />
							</button>
						</Dialog.Close>
					</header>

					<div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-6">
						<section>
							<div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Answer</div>
							<div className="prose max-w-none [overflow-wrap:anywhere]" dangerouslySetInnerHTML={{ __html: parseBlockMarkdown(card.back) }} />
						</section>

						{card.detailsMarkdown && (
							<section>
								<div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">Lesson</div>
								{detailsQuery.isLoading ? (
									<div className="text-sm text-muted-foreground">Loading…</div>
								) : (
									<div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: detailsQuery.data?.detailsHtml ?? "" }} />
								)}
							</section>
						)}
					</div>

					<footer className="border-t border-border p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4 space-y-3">
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
							{RATINGS.map((r) => {
								const nextIdx = nextIntervalIndex(card.intervalIndex, r.rating)
								const days = intervalDaysFor(nextIdx)
								return (
									<button
										key={r.rating}
										disabled={submit.isPending}
										onClick={() => submit.mutate({ cardId: card.id, rating: r.rating })}
										className={`${r.tone} disabled:opacity-50 px-3 py-3 sm:py-2 rounded-md text-sm font-medium transition active:scale-[0.97]`}
									>
										{r.label}
										<span className="ml-1.5 text-xs opacity-80">+{days}d</span>
									</button>
								)
							})}
						</div>
						<div className="flex items-center justify-between text-xs text-muted-foreground">
							<span>Step {card.intervalIndex}</span>
							<Link to="/cards/$id/edit" params={{ id: String(card.id) }} className="hover:text-foreground" onClick={() => onOpenChange(false)}>
								Edit
							</Link>
						</div>
					</footer>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	)
}
