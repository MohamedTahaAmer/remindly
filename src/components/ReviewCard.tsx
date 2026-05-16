import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { useMutation } from "@tanstack/react-query"
import { useTRPC } from "#/integrations/trpc/react"
import { useRouter } from "@tanstack/react-router"
import { intervalDaysFor, nextIntervalIndex } from "#/lib/schedule"
import type { ReviewRating } from "#/db/schema"

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

export function ReviewCard({ card }: { card: Card }) {
	const [revealed, setRevealed] = useState(false)
	const trpc = useTRPC()
	const router = useRouter()
	const submit = useMutation({
		...trpc.review.submit.mutationOptions(),
		onSuccess: () => {
			setRevealed(false)
			router.invalidate()
		},
	})

	return (
		<div className="flex flex-col rounded-xl border border-border bg-card text-card-foreground p-5 shadow-sm">
			<div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Front</div>
			<div className="text-base font-medium mb-4 [overflow-wrap:anywhere]">{card.front}</div>

			{revealed ? (
				<>
					<div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Back</div>
					<div className="text-sm mb-3 whitespace-pre-wrap [overflow-wrap:anywhere]">{card.back}</div>

					{card.detailsMarkdown && (
						<Link
							to="/cards/$id"
							params={{ id: String(card.id) }}
							className="inline-block text-xs text-sage hover:underline mb-3"
						>
							View full lesson →
						</Link>
					)}

					<div className="grid grid-cols-2 gap-2 mt-auto">
						{RATINGS.map((r) => {
							const nextIdx = nextIntervalIndex(card.intervalIndex, r.rating)
							const days = intervalDaysFor(nextIdx)
							return (
								<button
									key={r.rating}
									disabled={submit.isPending}
									onClick={() => submit.mutate({ cardId: card.id, rating: r.rating })}
									className={`${r.tone} disabled:opacity-50 px-3 py-2 rounded-md text-sm font-medium transition`}
								>
									{r.label}
									<span className="ml-1.5 text-xs opacity-80">+{days}d</span>
								</button>
							)
						})}
					</div>
				</>
			) : (
				<button
					onClick={() => setRevealed(true)}
					className="mt-auto rounded-md border border-border bg-background hover:bg-muted px-4 py-3 text-foreground transition"
				>
					Show answer
				</button>
			)}

			<div className="flex items-center justify-between mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
				<span>Step {card.intervalIndex}</span>
				<Link to="/cards/$id/edit" params={{ id: String(card.id) }} className="hover:text-foreground">
					Edit
				</Link>
			</div>
		</div>
	)
}
