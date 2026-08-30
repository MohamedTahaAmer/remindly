/* eslint-disable @typescript-eslint/no-unnecessary-condition -- drizzle types select results as non-nullable, but empty rowsets are real */
import { eq } from "drizzle-orm"
import { TRPCError } from "@trpc/server"

import { db } from "@remindly/db"
import { cardReviews, cards } from "@remindly/db/schema"
import { nextScheduledFor } from "#/lib/schedule"
import type { ReviewRating } from "@remindly/db/schema"

export class ReviewService {
	async submit(cardId: number, rating: ReviewRating) {
		const [card] = await db.select().from(cards).where(eq(cards.id, cardId)).limit(1)
		if (!card) throw new TRPCError({ code: "NOT_FOUND", message: "Card not found" })

		const before = card.intervalIndex
		const { intervalIndex, scheduledFor } = nextScheduledFor(rating, before)

		await db.insert(cardReviews).values({
			cardId: card.id,
			rating,
			intervalIndexBefore: before,
			intervalIndexAfter: intervalIndex,
			scheduledFor,
		})

		await db.update(cards).set({ intervalIndex, scheduledFor }).where(eq(cards.id, card.id))

		return { intervalIndex, scheduledFor }
	}

	async history(cardId: number) {
		return db.query.cardReviews.findMany({
			where: (t, { eq: eqOp }) => eqOp(t.cardId, cardId),
			orderBy: (t, { desc }) => [desc(t.reviewedAt)],
		})
	}
}

export const reviewService = new ReviewService()
