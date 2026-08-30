import { z } from "zod"
import { TRPCError } from "@trpc/server"
import type { TRPCRouterRecord } from "@trpc/server"

import { publicProcedure } from "#/server/infrastructure/trpc/trpc"
import { pastedImagesService as service } from "./pasted-images.service.ts"

// The byte streams stay on raw HTTP routes (binary upload, image serving) —
// see pasted-images.controller.ts.
export const pastedImagesRouter = {
	list: publicProcedure.query(() => service.list()),

	delete: publicProcedure.input(z.object({ name: z.string() })).mutation(({ input }) => {
		if (!service.delete(input.name)) throw new TRPCError({ code: "NOT_FOUND", message: "image not found" })
		return { ok: true }
	}),
} satisfies TRPCRouterRecord
