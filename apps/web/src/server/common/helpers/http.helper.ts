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
