/* eslint-disable @typescript-eslint/no-unnecessary-condition -- tidb-serverless drizzle adapter types select results as non-nullable, but empty rowsets are real */
import { z } from "zod"
import { eq } from "drizzle-orm"
import type { TRPCRouterRecord } from "@trpc/server"
import { TRPCError } from "@trpc/server"

import { publicProcedure } from "../init"
import { db } from "#/db"
import { cards, cardReviews, reviewRatingEnum } from "#/db/schema"
import { nextScheduledFor } from "#/lib/schedule"

export const reviewRouter = {
	submit: publicProcedure
		.input(
			z.object({
				cardId: z.number().int(),
				rating: z.enum(reviewRatingEnum),
			}),
		)
		.mutation(async ({ input }) => {
			const [card] = await db.select().from(cards).where(eq(cards.id, input.cardId)).limit(1)
			if (!card) throw new TRPCError({ code: "NOT_FOUND", message: "Card not found" })

			const before = card.intervalIndex
			const { intervalIndex, scheduledFor } = nextScheduledFor(input.rating, before)

			await db.insert(cardReviews).values({
				cardId: card.id,
				rating: input.rating,
				intervalIndexBefore: before,
				intervalIndexAfter: intervalIndex,
				scheduledFor,
			})

			await db.update(cards).set({ intervalIndex, scheduledFor }).where(eq(cards.id, card.id))

			return { intervalIndex, scheduledFor }
		}),

	history: publicProcedure.input(z.object({ cardId: z.number().int() })).query(async ({ input }) => {
		return db.query.cardReviews.findMany({
			where: (t, { eq }) => eq(t.cardId, input.cardId),
			orderBy: (t, { desc }) => [desc(t.reviewedAt)],
		})
	}),
} satisfies TRPCRouterRecord
