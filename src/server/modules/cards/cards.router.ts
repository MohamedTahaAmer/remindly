import { z } from "zod"
import type { TRPCRouterRecord } from "@trpc/server"

import { publicProcedure } from "#/server/infrastructure/trpc/trpc"
import { cardsService } from "./cards.service.ts"
import { cardInputSchema, dueTodayInputSchema, tagFilterInputSchema } from "./schema/cards.schema.ts"

export const cardsRouter = {
	list: publicProcedure.input(tagFilterInputSchema.optional()).query(({ input }) => cardsService.list(input)),

	get: publicProcedure.input(z.object({ id: z.number().int() })).query(({ input }) => cardsService.get(input.id)),

	details: publicProcedure.input(z.object({ id: z.number().int() })).query(({ input }) => cardsService.details(input.id)),

	create: publicProcedure.input(cardInputSchema).mutation(({ input }) => cardsService.create(input)),

	update: publicProcedure.input(cardInputSchema.extend({ id: z.number().int() })).mutation(({ input }) => cardsService.update(input)),

	delete: publicProcedure.input(z.object({ id: z.number().int() })).mutation(({ input }) => cardsService.delete(input.id)),

	dueToday: publicProcedure.input(dueTodayInputSchema.optional()).query(({ input }) => cardsService.dueToday(input)),

	surprise: publicProcedure
		.input(z.object({ n: z.number().int().min(1).max(20).default(5) }).optional())
		.query(({ input }) => cardsService.surprise(input?.n ?? 5)),
} satisfies TRPCRouterRecord
