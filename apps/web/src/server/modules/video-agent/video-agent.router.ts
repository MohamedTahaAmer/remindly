import type { TRPCRouterRecord } from "@trpc/server"

import { okOutputSchema } from "#/server/common/dto/common.dto"
import { publicProcedure } from "#/server/infrastructure/trpc/procedures"
import { videoAgentService as service } from "./video-agent.service.ts"
import {
	videoAgentAnalyzeInputSchema,
	videoAgentAnalyzeOutputSchema,
	videoAgentDeleteInputSchema,
	videoAgentListOutputSchema,
	videoAgentStartExportInputSchema,
	videoAgentStateInputSchema,
	videoAgentStateOutputSchema,
} from "./dto/video-agent.dto.ts"

// Pure glue: dto schemas + delegation. Logic (and TRPCErrors) live in the
// service. The byte streams stay on raw HTTP routes (upload, video serving,
// export download) — see video-agent.controller.ts.
export const videoAgentRouter = {
	list: publicProcedure.output(videoAgentListOutputSchema).query(() => service.list()),

	state: publicProcedure
		.input(videoAgentStateInputSchema)
		.output(videoAgentStateOutputSchema)
		.query(({ input }) => service.getStateOrThrow(input.id)),

	analyze: publicProcedure
		.input(videoAgentAnalyzeInputSchema)
		.output(videoAgentAnalyzeOutputSchema)
		.mutation(({ input }) => service.analyzeProject(input.id, input.force)),

	startExport: publicProcedure
		.input(videoAgentStartExportInputSchema)
		.output(okOutputSchema)
		.mutation(({ input }) => service.startExport(input.id, input.cuts)),

	delete: publicProcedure
		.input(videoAgentDeleteInputSchema)
		.output(okOutputSchema)
		.mutation(({ input }) => service.delete(input.id)),
} satisfies TRPCRouterRecord
