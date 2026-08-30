import { z } from "zod"
import { TRPCError } from "@trpc/server"
import type { TRPCRouterRecord } from "@trpc/server"

import { publicProcedure } from "#/server/infrastructure/trpc/trpc"
import { pastedTextsService as service } from "./pasted-texts.service.ts"

// The plain-text view (`GET /pasted-texts/:id`, opened in a new tab) stays on
// a raw HTTP route — see pasted-texts.controller.ts.
export const pastedTextsRouter = {
	list: publicProcedure.query(() => service.list()),

	create: publicProcedure.input(z.object({ text: z.string().trim().min(1) })).mutation(async ({ input }) => {
		const id = await service.create(input.text)
		return { id }
	}),

	delete: publicProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input }) => {
		if (!(await service.delete(input.id))) throw new TRPCError({ code: "NOT_FOUND", message: "text not found" })
		return { ok: true }
	}),
} satisfies TRPCRouterRecord
