import type { TRPCRouterRecord } from "@trpc/server"

import { okOutputSchema } from "#/server/common/dto/common.dto"
import { publicProcedure } from "#/server/infrastructure/trpc/trpc"
import { cardsService } from "./cards.service.ts"
import {
	cardCreateInputSchema,
	cardCreateOutputSchema,
	cardDeleteInputSchema,
	cardDetailsInputSchema,
	cardDetailsOutputSchema,
	cardDueTodayInputSchema,
	cardDueTodayOutputSchema,
	cardGetInputSchema,
	cardGetOutputSchema,
	cardListInputSchema,
	cardListOutputSchema,
	cardSurpriseInputSchema,
	cardSurpriseOutputSchema,
	cardUpdateInputSchema,
} from "./dto/cards.dto.ts"

// Pure glue: dto schemas + delegation. Logic lives in the service.
export const cardsRouter = {
	list: publicProcedure
		.input(cardListInputSchema)
		.output(cardListOutputSchema)
		.query(({ input }) => cardsService.list(input)),

	get: publicProcedure
		.input(cardGetInputSchema)
		.output(cardGetOutputSchema)
		.query(({ input }) => cardsService.get(input.id)),

	details: publicProcedure
		.input(cardDetailsInputSchema)
		.output(cardDetailsOutputSchema)
		.query(({ input }) => cardsService.details(input.id)),

	create: publicProcedure
		.input(cardCreateInputSchema)
		.output(cardCreateOutputSchema)
		.mutation(({ input }) => cardsService.create(input)),

	update: publicProcedure
		.input(cardUpdateInputSchema)
		.output(okOutputSchema)
		.mutation(({ input }) => cardsService.update(input)),

	delete: publicProcedure
		.input(cardDeleteInputSchema)
		.output(okOutputSchema)
		.mutation(({ input }) => cardsService.delete(input.id)),

	dueToday: publicProcedure
		.input(cardDueTodayInputSchema)
		.output(cardDueTodayOutputSchema)
		.query(({ input }) => cardsService.dueToday(input)),

	surprise: publicProcedure
		.input(cardSurpriseInputSchema)
		.output(cardSurpriseOutputSchema)
		.query(({ input }) => cardsService.surprise(input?.n)),
} satisfies TRPCRouterRecord
