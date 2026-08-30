import fs from "node:fs"
import path from "node:path"
import { TRPCError } from "@trpc/server"

import { serverConfig } from "#/server/infrastructure/config/config"

// Text paste board (/pt). Snippets live in a SQLite db on this machine's disk
// (TEXTS_DB_PATH, falling back to _local/pasted-texts.db).
// SQLite comes from the runtime itself, not npm: node:sqlite under Node,
// bun:sqlite under Bun (the remindly systemd service has no node on PATH, so
// vite preview runs under Bun there). The two expose the same
// prepare/all/get/run surface used below.
type SqliteDb = {
	exec: (sql: string) => void
	prepare: (sql: string) => {
		all: (...params: Array<string | number>) => Array<Record<string, unknown>>
		get: (...params: Array<string | number>) => Record<string, unknown> | undefined | null
		run: (...params: Array<string | number>) => { changes: number | bigint; lastInsertRowid: number | bigint }
	}
}

export type PastedText = { id: number; text: string; createdAt: string }

export class PastedTextsService {
	private dbPromise: Promise<SqliteDb> | null = null

	private openDb(): Promise<SqliteDb> {
		this.dbPromise ??= (async () => {
			const file = serverConfig.pastedTextsDbPath
			fs.mkdirSync(path.dirname(file), { recursive: true })
			// computed specifier: a literal "bun:sqlite" would fail TS/bundler
			// resolution, and each runtime only ships its own module
			const specifier = process.versions.bun ? "bun:sqlite" : "node:sqlite"
			const sqlite = (await import(/* @vite-ignore */ specifier)) as {
				Database?: new (path: string) => SqliteDb
				DatabaseSync?: new (path: string) => SqliteDb
			}
			const Database = sqlite.Database ?? sqlite.DatabaseSync
			if (!Database) throw new Error(`no sqlite constructor in ${specifier}`)
			const db = new Database(file)
			db.exec("CREATE TABLE IF NOT EXISTS texts (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))")
			return db
		})()
		return this.dbPromise
	}

	async list(): Promise<Array<PastedText>> {
		const db = await this.openDb()
		return db.prepare("SELECT id, text, created_at AS createdAt FROM texts ORDER BY id DESC").all() as Array<PastedText>
	}

	async create(text: string) {
		const db = await this.openDb()
		const { lastInsertRowid } = db.prepare("INSERT INTO texts (text) VALUES (?)").run(text)
		return { id: Number(lastInsertRowid) }
	}

	async get(id: number): Promise<string | null> {
		const db = await this.openDb()
		const row = db.prepare("SELECT text FROM texts WHERE id = ?").get(id) as { text: string } | undefined | null
		return row?.text ?? null
	}

	async delete(id: number) {
		const db = await this.openDb()
		const { changes } = db.prepare("DELETE FROM texts WHERE id = ?").run(id)
		if (changes === 0) throw new TRPCError({ code: "NOT_FOUND", message: "text not found" })
		return { ok: true } as const
	}
}

export const pastedTextsService = new PastedTextsService()
