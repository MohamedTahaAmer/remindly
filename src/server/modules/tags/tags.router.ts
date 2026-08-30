import { z } from "zod"
import type { TRPCRouterRecord } from "@trpc/server"

import { publicProcedure } from "#/server/infrastructure/trpc/trpc"
import { tagsService } from "./tags.service.ts"

export const tagsRouter = {
	list: publicProcedure.query(() => tagsService.list()),

	create: publicProcedure.input(z.object({ name: z.string().trim().min(1).max(100) })).mutation(({ input }) => tagsService.create(input.name)),

	delete: publicProcedure.input(z.object({ id: z.number().int() })).mutation(({ input }) => tagsService.delete(input.id)),
} satisfies TRPCRouterRecord
