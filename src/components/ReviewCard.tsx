import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { CardModal } from "#/components/CardModal"
import { parseInlineMarkdown } from "#/lib/markdown"

type Card = {
	id: number
	front: string
	back: string
	detailsMarkdown: string | null
	intervalIndex: number
}

export function ReviewCard({ card }: { card: Card }) {
	const [open, setOpen] = useState(false)
	const titleHtml = parseInlineMarkdown(card.front)

	return (
		<>
			<div className="flex flex-col rounded-xl border border-border bg-card text-card-foreground p-5 shadow-sm">
				<div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Front</div>
				<div
					className="text-base font-medium mb-4 [overflow-wrap:anywhere] [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-[0.9em]"
					dangerouslySetInnerHTML={{ __html: titleHtml }}
				/>

				<button
					onClick={() => setOpen(true)}
					className="mt-auto rounded-md border border-border bg-background hover:bg-muted px-4 py-3 text-foreground transition"
				>
					Show more
				</button>

				<div className="flex items-center justify-between mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
					<span>Step {card.intervalIndex}</span>
					<Link to="/cards/$id/edit" params={{ id: String(card.id) }} className="hover:text-foreground">
						Edit
					</Link>
				</div>
			</div>

			<CardModal card={card} open={open} onOpenChange={setOpen} />
		</>
	)
}
