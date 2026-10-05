import { Readable } from "node:stream"
import fs from "node:fs"

export function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

/** Wrap a file (or a byte range of it) as a web ReadableStream for a Response body. */
export function fileStream(file: string, range?: { start: number; end: number }): ReadableStream {
	const stream = fs.createReadStream(file, range)
	return Readable.toWeb(stream) as unknown as ReadableStream
}

/** Serve a file honoring `Range` requests — required or `<video>` seeking breaks. */
export function rangedFileResponse(request: Request, file: string, mime: string, extraHeaders: Record<string, string> = {}): Response {
	const size = fs.statSync(file).size
	const headers: Record<string, string> = { ...extraHeaders, "accept-ranges": "bytes", "content-type": mime }

	const range = request.headers.get("range")?.match(/bytes=(\d*)-(\d*)/)
	if (range && (range[1] !== "" || range[2] !== "")) {
		const start = range[1] === "" ? Math.max(0, size - Number.parseInt(range[2], 10)) : Number.parseInt(range[1], 10)
		const end = range[2] === "" || range[1] === "" ? size - 1 : Math.min(size - 1, Number.parseInt(range[2], 10))
		if (start > end || start >= size) return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } })
		headers["content-range"] = `bytes ${start}-${end}/${size}`
		headers["content-length"] = String(end - start + 1)
		return new Response(fileStream(file, { start, end }), { status: 206, headers })
	}
	headers["content-length"] = String(size)
	return new Response(fileStream(file), { headers })
}
