import type { TRPCRouterRecord } from "@trpc/server"

import { publicProcedure } from "#/server/infrastructure/trpc/trpc"
import { reviewService } from "./review.service.ts"
import { reviewHistoryInputSchema, reviewHistoryOutputSchema, reviewSubmitInputSchema, reviewSubmitOutputSchema } from "./dto/review.dto.ts"

// Pure glue: dto schemas + delegation. Logic lives in the service.
export const reviewRouter = {
	submit: publicProcedure
		.input(reviewSubmitInputSchema)
		.output(reviewSubmitOutputSchema)
		.mutation(({ input }) => reviewService.submit(input.cardId, input.rating)),

	history: publicProcedure
		.input(reviewHistoryInputSchema)
		.output(reviewHistoryOutputSchema)
		.query(({ input }) => reviewService.history(input.cardId)),
} satisfies TRPCRouterRecord
