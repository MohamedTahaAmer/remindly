import { z } from "zod"
import type { TRPCRouterRecord } from "@trpc/server"

import { publicProcedure } from "#/server/infrastructure/trpc/trpc"
import { reviewRatingEnum } from "#/server/infrastructure/database/schema"
import { reviewService } from "./review.service.ts"

export const reviewRouter = {
	submit: publicProcedure
		.input(
			z.object({
				cardId: z.number().int(),
				rating: z.enum(reviewRatingEnum),
			}),
		)
		.mutation(({ input }) => reviewService.submit(input.cardId, input.rating)),

	history: publicProcedure.input(z.object({ cardId: z.number().int() })).query(({ input }) => reviewService.history(input.cardId)),
} satisfies TRPCRouterRecord
