import fs from "node:fs"
import path from "node:path"

import { fileStream, json } from "#/server/common/helpers/http.helper"
import { Logger } from "#/server/common/services/logger"
import { PROJECT_ID_RE, VIDEO_EXTS } from "./video-agent.constants.ts"
import { videoAgentService as service } from "./video-agent.service.ts"
import type { ProjectState } from "./dto/video-agent.dto.ts"

/**
 * Raw HTTP layer for the video-agent byte streams — the calls tRPC can't
 * carry: the streamed binary upload, the byte-range `<video>` source, and the
 * export download. Everything JSON-shaped lives in video-agent.router.ts.
 * Bound to URLs by the file routes in src/routes/api.video-agent.*.
 */
export class VideoAgentController {
	private readonly logger = new Logger(VideoAgentController.name)

	/** The id regex is the path-traversal guard for every :id endpoint. */
	private stateOr404(id: string): ProjectState | Response {
		const state = PROJECT_ID_RE.test(id) ? service.readState(id) : null
		if (!state) return json({ error: "unknown project" }, 404)
		return state
	}

	async upload(request: Request): Promise<Response> {
		const rawName = new URL(request.url).searchParams.get("name") ?? "video.mp4"
		const name = path.basename(rawName)
		const ext = path.extname(name).slice(1).toLowerCase()
		if (!(ext in VIDEO_EXTS)) return json({ error: `unsupported video extension .${ext} (want ${Object.keys(VIDEO_EXTS).join("|")})` }, 400)
		if (!request.body) return json({ error: "expected a video body" }, 400)

		const id = await service.createProject(name, ext, request.body)
		this.logger.log(`upload ${id} (${name}) saved, processing`)
		// respond once saved; the pipeline continues async, driving state.json
		service.process(id).catch((err: Error) => {
			this.logger.error(`processing ${id} failed`, err)
			service.patchState(id, { status: "error", error: err.message })
		})
		return json({ id })
	}

	video(request: Request, id: string): Response {
		const state = this.stateOr404(id)
		if (state instanceof Response) return state
		const source = service.sourceOf(id)
		if (!source) return json({ error: "source missing" }, 404)

		const size = fs.statSync(source).size
		const mime = VIDEO_EXTS[path.extname(source).slice(1)] ?? "application/octet-stream"
		const headers: Record<string, string> = { "accept-ranges": "bytes", "content-type": mime }

		// byte ranges are required or <video> seeking breaks
		const range = request.headers.get("range")?.match(/bytes=(\d*)-(\d*)/)
		if (range && (range[1] !== "" || range[2] !== "")) {
			const start = range[1] === "" ? Math.max(0, size - Number.parseInt(range[2], 10)) : Number.parseInt(range[1], 10)
			const end = range[2] === "" || range[1] === "" ? size - 1 : Math.min(size - 1, Number.parseInt(range[2], 10))
			if (start > end || start >= size) return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } })
			headers["content-range"] = `bytes ${start}-${end}/${size}`
			headers["content-length"] = String(end - start + 1)
			return new Response(fileStream(source, { start, end }), { status: 206, headers })
		}
		headers["content-length"] = String(size)
		return new Response(fileStream(source), { headers })
	}

	downloadExport(id: string): Response {
		const state = this.stateOr404(id)
		if (state instanceof Response) return state
		const file = service.exportFileOf(id)
		if (state.export.status !== "ready" || !fs.existsSync(file)) return json({ error: "no export available" }, 404)

		const base = state.name.replace(/\.[a-z0-9]+$/i, "").replace(/[^\w.-]+/g, "_")
		return new Response(fileStream(file), {
			headers: {
				"content-type": "video/mp4",
				"content-length": String(fs.statSync(file).size),
				"content-disposition": `attachment; filename="${base}-edited.mp4"`,
			},
		})
	}
}

export const videoAgentController = new VideoAgentController()
