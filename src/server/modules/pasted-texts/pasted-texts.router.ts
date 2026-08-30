import type { TRPCRouterRecord } from "@trpc/server"

import { okOutputSchema } from "#/server/common/dto/common.dto"
import { publicProcedure } from "#/server/infrastructure/trpc/procedures"
import { pastedTextsService as service } from "./pasted-texts.service.ts"
import { pastedTextCreateInputSchema, pastedTextCreateOutputSchema, pastedTextDeleteInputSchema, pastedTextListOutputSchema } from "./dto/pasted-texts.dto.ts"

// Pure glue: dto schemas + delegation. Logic (and TRPCErrors) live in the
// service. The plain-text view (`GET /pasted-texts/:id`, opened in a new tab)
// stays on a raw HTTP route — see pasted-texts.controller.ts.
export const pastedTextsRouter = {
	list: publicProcedure.output(pastedTextListOutputSchema).query(() => service.list()),

	create: publicProcedure
		.input(pastedTextCreateInputSchema)
		.output(pastedTextCreateOutputSchema)
		.mutation(({ input }) => service.create(input.text)),

	delete: publicProcedure
		.input(pastedTextDeleteInputSchema)
		.output(okOutputSchema)
		.mutation(({ input }) => service.delete(input.id)),
} satisfies TRPCRouterRecord
