import fs from "node:fs"
import path from "node:path"
import { loadEnv } from "vite"
import type { Connect, Plugin } from "vite"

// Local-only image paste box (/paste-photos). Files live outside the app build
// on the dev machine's disk, so this runs as Node middleware on the Vite server
// instead of a server route (the SSR runtime is workerd, whose node:fs is an
// unenv stub — fs.mkdir throws "not implemented").
// The storage dir is read from PHOTOS_BASE_DIR in .env / .env.local,
// falling back to _local/pasted-images under the repo root.
let DIR = ""

const MIME_TO_EXT: Record<string, string> = {
	"image/png": "png",
	"image/jpeg": "jpg",
	"image/gif": "gif",
	"image/webp": "webp",
	"image/svg+xml": "svg",
	"image/avif": "avif",
	"image/bmp": "bmp",
}
const EXT_TO_MIME = Object.fromEntries(Object.entries(MIME_TO_EXT).map(([mime, ext]) => [ext, mime]))

const middleware: Connect.NextHandleFunction = (req, res, next) => {
	const url = new URL(req.url ?? "/", "http://localhost")

	if (url.pathname === "/api/pasted-images" && req.method === "GET") {
		fs.mkdirSync(DIR, { recursive: true })
		const names = fs
			.readdirSync(DIR)
			.filter((name) => path.extname(name).slice(1) in EXT_TO_MIME)
			.map((name) => ({ name, mtime: fs.statSync(path.join(DIR, name)).mtimeMs }))
			.sort((a, b) => b.mtime - a.mtime)
			.map((f) => f.name)
		res.setHeader("content-type", "application/json")
		res.end(JSON.stringify(names))
		return
	}

	if (url.pathname === "/api/pasted-images" && req.method === "POST") {
		const chunks: Array<Buffer> = []
		req.on("data", (chunk: Buffer) => chunks.push(chunk))
		req.on("end", () => {
			const body = Buffer.concat(chunks)
			const mime = (req.headers["content-type"] ?? "").split(";")[0].trim()
			const ext = MIME_TO_EXT[mime]
			if (!ext || body.length === 0) {
				res.statusCode = 400
				res.end(JSON.stringify({ error: "expected a non-empty image body" }))
				return
			}
			const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15)
			const name = `img-${stamp}-${Math.random().toString(36).slice(2, 8)}.${ext}`
			fs.mkdirSync(DIR, { recursive: true })
			fs.writeFileSync(path.join(DIR, name), body)
			res.setHeader("content-type", "application/json")
			res.end(JSON.stringify({ url: `/pasted-images/${name}` }))
		})
		return
	}

	if (url.pathname.startsWith("/pasted-images/") && req.method === "DELETE") {
		const name = decodeURIComponent(url.pathname.slice("/pasted-images/".length))
		const file = path.join(DIR, name)
		if (name.includes("/") || name.includes("..") || !fs.existsSync(file)) {
			res.statusCode = 404
			res.end("not found")
			return
		}
		fs.unlinkSync(file)
		res.setHeader("content-type", "application/json")
		res.end(JSON.stringify({ ok: true }))
		return
	}

	if (url.pathname.startsWith("/pasted-images/") && req.method === "GET") {
		const name = decodeURIComponent(url.pathname.slice("/pasted-images/".length))
		const file = path.join(DIR, name)
		if (name.includes("/") || name.includes("..") || !fs.existsSync(file)) {
			res.statusCode = 404
			res.end("not found")
			return
		}
		res.setHeader("content-type", EXT_TO_MIME[path.extname(name).slice(1)] ?? "application/octet-stream")
		res.setHeader("cache-control", "public, max-age=31536000, immutable")
		fs.createReadStream(file).pipe(res)
		return
	}

	next()
}

export function pastedImages(): Plugin {
	return {
		name: "pasted-images",
		configResolved(config) {
			// loadEnv types values as string, but keys absent from .env are undefined
			const env = loadEnv(config.mode, config.root, "") as Record<string, string | undefined>
			DIR = path.resolve(config.root, env.PHOTOS_BASE_DIR ?? "_local/pasted-images")
		},
		configureServer(server) {
			server.middlewares.use(middleware)
		},
		configurePreviewServer(server) {
			server.middlewares.use(middleware)
		},
	}
}
