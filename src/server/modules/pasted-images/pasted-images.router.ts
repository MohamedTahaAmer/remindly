import { z } from "zod"
import type { TRPCRouterRecord } from "@trpc/server"

import { publicProcedure } from "#/server/infrastructure/trpc/trpc"
import { pastedImagesService as service } from "./pasted-images.service.ts"

// Pure glue: input schemas + delegation. Logic (and TRPCErrors) live in the
// service. The byte streams stay on raw HTTP routes (binary upload, image
// serving) — see pasted-images.controller.ts.
export const pastedImagesRouter = {
	list: publicProcedure.query(() => service.list()),

	delete: publicProcedure.input(z.object({ name: z.string() })).mutation(({ input }) => service.delete(input.name)),
} satisfies TRPCRouterRecord
