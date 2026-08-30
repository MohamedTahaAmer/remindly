import type { TRPCRouterRecord } from "@trpc/server"

import { okOutputSchema } from "#/server/common/dto/common.dto"
import { publicProcedure } from "#/server/infrastructure/trpc/procedures"
import { tagsService } from "./tags.service.ts"
import { tagCreateInputSchema, tagCreateOutputSchema, tagDeleteInputSchema, tagListOutputSchema } from "./dto/tags.dto.ts"

// Pure glue: dto schemas + delegation. Logic lives in the service.
export const tagsRouter = {
	list: publicProcedure.output(tagListOutputSchema).query(() => tagsService.list()),

	create: publicProcedure
		.input(tagCreateInputSchema)
		.output(tagCreateOutputSchema)
		.mutation(({ input }) => tagsService.create(input.name)),

	delete: publicProcedure
		.input(tagDeleteInputSchema)
		.output(okOutputSchema)
		.mutation(({ input }) => tagsService.delete(input.id)),
} satisfies TRPCRouterRecord
