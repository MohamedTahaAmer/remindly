import { z } from "zod"
import type { TRPCRouterRecord } from "@trpc/server"

import { publicProcedure } from "#/server/infrastructure/trpc/trpc"
import { pastedTextsService as service } from "./pasted-texts.service.ts"

// Pure glue: input schemas + delegation. Logic (and TRPCErrors) live in the
// service. The plain-text view (`GET /pasted-texts/:id`, opened in a new tab)
// stays on a raw HTTP route — see pasted-texts.controller.ts.
export const pastedTextsRouter = {
	list: publicProcedure.query(() => service.list()),

	create: publicProcedure.input(z.object({ text: z.string().trim().min(1) })).mutation(({ input }) => service.create(input.text)),

	delete: publicProcedure.input(z.object({ id: z.number().int() })).mutation(({ input }) => service.delete(input.id)),
} satisfies TRPCRouterRecord
