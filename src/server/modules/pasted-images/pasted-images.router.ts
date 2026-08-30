import type { TRPCRouterRecord } from "@trpc/server"

import { okOutputSchema } from "#/server/common/dto/common.dto"
import { publicProcedure } from "#/server/infrastructure/trpc/trpc"
import { pastedImagesService as service } from "./pasted-images.service.ts"
import { pastedImageDeleteInputSchema, pastedImageListOutputSchema } from "./dto/pasted-images.dto.ts"

// Pure glue: dto schemas + delegation. Logic (and TRPCErrors) live in the
// service. The byte streams stay on raw HTTP routes (binary upload, image
// serving) — see pasted-images.controller.ts.
export const pastedImagesRouter = {
	list: publicProcedure.output(pastedImageListOutputSchema).query(() => service.list()),

	delete: publicProcedure
		.input(pastedImageDeleteInputSchema)
		.output(okOutputSchema)
		.mutation(({ input }) => service.delete(input.name)),
} satisfies TRPCRouterRecord
