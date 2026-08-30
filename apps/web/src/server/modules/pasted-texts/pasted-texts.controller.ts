import { pastedTextsService as service } from "./pasted-texts.service.ts"

/**
 * Raw HTTP layer for pasted-texts — only the plain-text view opened in a new
 * tab, which needs a real URL. Everything JSON-shaped lives in
 * pasted-texts.router.ts.
 */
export class PastedTextsController {
	async serve(rawId: string): Promise<Response> {
		const id = Number(rawId)
		const text = Number.isInteger(id) ? await service.get(id) : null
		if (text === null) return new Response("not found", { status: 404 })
		return new Response(text, { headers: { "content-type": "text/plain; charset=utf-8" } })
	}
}

export const pastedTextsController = new PastedTextsController()
