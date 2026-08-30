import { json } from "#/server/common/helpers/http.helper"
import { pastedTextsService as service } from "./pasted-texts.service.ts"

export class PastedTextsController {
	async list(): Promise<Response> {
		return json(await service.list())
	}

	async create(request: Request): Promise<Response> {
		const text = await request.text()
		if (text.trim().length === 0) return json({ error: "expected a non-empty text body" }, 400)
		const id = await service.create(text)
		return json({ id })
	}

	async serve(rawId: string): Promise<Response> {
		const id = Number(rawId)
		const text = Number.isInteger(id) ? await service.get(id) : null
		if (text === null) return new Response("not found", { status: 404 })
		return new Response(text, { headers: { "content-type": "text/plain; charset=utf-8" } })
	}

	async delete(rawId: string): Promise<Response> {
		const id = Number(rawId)
		if (!Number.isInteger(id) || !(await service.delete(id))) return new Response("not found", { status: 404 })
		return json({ ok: true })
	}
}

export const pastedTextsController = new PastedTextsController()
