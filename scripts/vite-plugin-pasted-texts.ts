import fs from "node:fs"
import path from "node:path"
import { loadEnv } from "vite"
import type { Connect, Plugin } from "vite"

// Local-only text paste board (/pt). Snippets live outside the app build in a
// SQLite db on the dev machine's disk, so this runs as Node middleware on the
// Vite server instead of a server route (the SSR runtime is workerd, whose
// node:fs / node:sqlite are unenv stubs).
// The db path is read from TEXTS_DB_PATH in .env / .env.local,
// falling back to _local/pasted-texts.db under the repo root.
// SQLite comes from the runtime itself, not npm: node:sqlite under Node,
// bun:sqlite under Bun (the remindly systemd service has no node on PATH,
// so vite preview runs under Bun there). The two expose the same
// prepare/all/get/run surface used below.
type Db = {
	exec: (sql: string) => void
	prepare: (sql: string) => {
		all: (...params: Array<string | number>) => Array<Record<string, unknown>>
		get: (...params: Array<string | number>) => Record<string, unknown> | undefined | null
		run: (...params: Array<string | number>) => { changes: number | bigint; lastInsertRowid: number | bigint }
	}
}
let db: Db

const middleware: Connect.NextHandleFunction = (req, res, next) => {
	const url = new URL(req.url ?? "/", "http://localhost")

	if (url.pathname === "/api/pasted-texts" && req.method === "GET") {
		const rows = db.prepare("SELECT id, text, created_at AS createdAt FROM texts ORDER BY id DESC").all()
		res.setHeader("content-type", "application/json")
		res.end(JSON.stringify(rows))
		return
	}

	if (url.pathname === "/api/pasted-texts" && req.method === "POST") {
		const chunks: Array<Buffer> = []
		req.on("data", (chunk: Buffer) => chunks.push(chunk))
		req.on("end", () => {
			const text = Buffer.concat(chunks).toString("utf8")
			if (text.trim().length === 0) {
				res.statusCode = 400
				res.end(JSON.stringify({ error: "expected a non-empty text body" }))
				return
			}
			const { lastInsertRowid } = db.prepare("INSERT INTO texts (text) VALUES (?)").run(text)
			res.setHeader("content-type", "application/json")
			res.end(JSON.stringify({ id: Number(lastInsertRowid) }))
		})
		return
	}

	const idMatch = /^\/pasted-texts\/(\d+)$/.exec(url.pathname)

	if (idMatch && req.method === "DELETE") {
		const { changes } = db.prepare("DELETE FROM texts WHERE id = ?").run(Number(idMatch[1]))
		if (changes === 0) {
			res.statusCode = 404
			res.end("not found")
			return
		}
		res.setHeader("content-type", "application/json")
		res.end(JSON.stringify({ ok: true }))
		return
	}

	if (idMatch && req.method === "GET") {
		const row = db.prepare("SELECT text FROM texts WHERE id = ?").get(Number(idMatch[1])) as { text: string } | undefined | null
		if (row == null) {
			res.statusCode = 404
			res.end("not found")
			return
		}
		res.setHeader("content-type", "text/plain; charset=utf-8")
		res.end(row.text)
		return
	}

	next()
}

export function pastedTexts(): Plugin {
	return {
		name: "pasted-texts",
		async configResolved(config) {
			// loadEnv types values as string, but keys absent from .env are undefined
			const env = loadEnv(config.mode, config.root, "") as Record<string, string | undefined>
			const file = path.resolve(config.root, env.TEXTS_DB_PATH ?? "_local/pasted-texts.db")
			fs.mkdirSync(path.dirname(file), { recursive: true })
			// computed specifier: a literal "bun:sqlite" would fail TS/bundler
			// resolution, and each runtime only ships its own module
			const specifier = process.versions.bun ? "bun:sqlite" : "node:sqlite"
			const sqlite = (await import(/* @vite-ignore */ specifier)) as {
				Database?: new (path: string) => Db
				DatabaseSync?: new (path: string) => Db
			}
			const Database = sqlite.Database ?? sqlite.DatabaseSync
			if (!Database) throw new Error(`no sqlite constructor in ${specifier}`)
			db = new Database(file)
			db.exec("CREATE TABLE IF NOT EXISTS texts (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))")
		},
		configureServer(server) {
			server.middlewares.use(middleware)
		},
		configurePreviewServer(server) {
			server.middlewares.use(middleware)
		},
	}
}
