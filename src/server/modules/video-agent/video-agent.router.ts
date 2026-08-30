import { z } from "zod"
import { TRPCError } from "@trpc/server"
import type { TRPCRouterRecord } from "@trpc/server"

import { publicProcedure } from "#/server/infrastructure/trpc/trpc"
import { MAX_ANALYZE_WORDS, PROJECT_ID_RE } from "./video-agent.constants.ts"
import { exportInputSchema } from "./schema/video-agent.schema.ts"
import { videoAgentService as service } from "./video-agent.service.ts"
import type { ProjectState } from "./schema/video-agent.schema.ts"

const idInput = z.object({ id: z.string() })

/** The id regex is the path-traversal guard for every project procedure. */
function stateOrThrow(id: string): ProjectState {
	const state = PROJECT_ID_RE.test(id) ? service.readState(id) : null
	if (!state) throw new TRPCError({ code: "NOT_FOUND", message: "unknown project" })
	return state
}

// JSON-shaped video-agent calls. The byte streams stay on raw HTTP routes
// (upload, video serving, export download) — see video-agent.controller.ts.
export const videoAgentRouter = {
	list: publicProcedure.query(() => service.list()),

	state: publicProcedure.input(idInput).query(({ input }) => stateOrThrow(input.id)),

	analyze: publicProcedure.input(idInput.extend({ force: z.boolean().default(false) })).mutation(async ({ input }) => {
		const state = stateOrThrow(input.id)
		if (!state.words || state.words.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: state.transcriptError ?? "no transcript available" })
		if (state.words.length > MAX_ANALYZE_WORDS) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "video too long for AI analysis" })

		// each run bills a subscription request — return the cached result unless forced
		if (state.analysis && !input.force) return { cuts: state.analysis.cuts, flagged: state.analysis.flagged }
		try {
			const result = await service.analyze(state)
			service.patchState(input.id, { analysis: { ...result, at: new Date().toISOString() } })
			return result
		} catch (err) {
			throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (err as Error).message })
		}
	}),

	startExport: publicProcedure.input(idInput.extend(exportInputSchema.shape)).mutation(({ input }) => {
		const state = stateOrThrow(input.id)
		if (state.export.status === "rendering") throw new TRPCError({ code: "CONFLICT", message: "already rendering" })

		service.patchState(input.id, { export: { status: "rendering" } })
		// render async; the frontend polls `state` until export.status settles
		service
			.renderExport(input.id, input.cuts)
			.then(() => service.patchState(input.id, { export: { status: "ready" } }))
			.catch((err: Error) => service.patchState(input.id, { export: { status: "error", error: err.message } }))
		return { ok: true }
	}),

	delete: publicProcedure.input(idInput).mutation(({ input }) => {
		stateOrThrow(input.id)
		service.delete(input.id)
		return { ok: true }
	}),
} satisfies TRPCRouterRecord
