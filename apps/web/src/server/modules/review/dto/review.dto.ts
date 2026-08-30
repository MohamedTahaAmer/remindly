import { createSelectSchema } from "drizzle-zod"
import { z } from "zod"

import { cardReviews, reviewRatingEnum } from "@remindly/db/schema"

export const cardReviewSchema = createSelectSchema(cardReviews)

export const reviewSubmitInputSchema = z.object({
	cardId: z.number().int(),
	rating: z.enum(reviewRatingEnum),
})
export const reviewSubmitOutputSchema = z.object({ intervalIndex: z.number().int(), scheduledFor: z.date() })

export const reviewHistoryInputSchema = z.object({ cardId: z.number().int() })
export const reviewHistoryOutputSchema = z.array(cardReviewSchema)
