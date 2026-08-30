import path from "node:path"
import fs from "node:fs"

import { fileStream, json } from "#/server/common/helpers/http.helper"
import { EXT_TO_MIME, IMAGE_NAME_RE, MIME_TO_EXT } from "./pasted-images.constants.ts"
import { pastedImagesService as service } from "./pasted-images.service.ts"

/**
 * Raw HTTP layer for the pasted-images byte streams — the binary upload and
 * the image serving (`<img src>` needs a plain URL). Everything JSON-shaped
 * lives in pasted-images.router.ts.
 */
export class PastedImagesController {
	async upload(request: Request): Promise<Response> {
		const body = Buffer.from(await request.arrayBuffer())
		const mime = (request.headers.get("content-type") ?? "").split(";")[0].trim()
		const ext = MIME_TO_EXT[mime]
		if (!ext || body.length === 0) return json({ error: "expected a non-empty image body" }, 400)

		let name = new URL(request.url).searchParams.get("name")
		if (name !== null && (!IMAGE_NAME_RE.test(name) || !name.endsWith(`.${ext}`))) return json({ error: "invalid name" }, 400)
		if (name === null) {
			const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15)
			name = `img-${stamp}-${Math.random().toString(36).slice(2, 8)}.${ext}`
		}
		service.save(name, body)
		return json({ url: `/pasted-images/${name}` })
	}

	serve(name: string): Response {
		const file = service.fileOf(name)
		if (!file) return new Response("not found", { status: 404 })
		return new Response(fileStream(file), {
			headers: {
				"content-type": EXT_TO_MIME[path.extname(name).slice(1)] ?? "application/octet-stream",
				"content-length": String(fs.statSync(file).size),
				"cache-control": "public, max-age=31536000, immutable",
			},
		})
	}
}

export const pastedImagesController = new PastedImagesController()
