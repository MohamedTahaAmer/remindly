import { z } from "zod"
import type { TRPCRouterRecord } from "@trpc/server"

import { publicProcedure } from "#/server/infrastructure/trpc/trpc"
import { exportInputSchema } from "./schema/video-agent.schema.ts"
import { videoAgentService as service } from "./video-agent.service.ts"

const idInput = z.object({ id: z.string() })

// Pure glue: input schemas + delegation. Logic (and TRPCErrors) live in the
// service. The byte streams stay on raw HTTP routes (upload, video serving,
// export download) — see video-agent.controller.ts.
export const videoAgentRouter = {
	list: publicProcedure.query(() => service.list()),

	state: publicProcedure.input(idInput).query(({ input }) => service.getStateOrThrow(input.id)),

	analyze: publicProcedure.input(idInput.extend({ force: z.boolean().default(false) })).mutation(({ input }) => service.analyzeProject(input.id, input.force)),

	startExport: publicProcedure.input(idInput.extend(exportInputSchema.shape)).mutation(({ input }) => service.startExport(input.id, input.cuts)),

	delete: publicProcedure.input(idInput).mutation(({ input }) => service.delete(input.id)),
} satisfies TRPCRouterRecord
