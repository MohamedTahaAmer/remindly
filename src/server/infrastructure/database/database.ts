import { drizzle } from "drizzle-orm/mysql2"
import mysql from "mysql2/promise"

import { Logger } from "#/server/common/services/logger"
import { serverConfig } from "../config/config.ts"
import * as schema from "./schema.ts"

const logger = new Logger("Database")

function createDb() {
	// TiDB Cloud speaks the MySQL protocol but requires TLS; local MySQL doesn't.
	const isLocal = /@(localhost|127\.0\.0\.1)/.test(serverConfig.databaseUri)
	const pool = mysql.createPool({ uri: serverConfig.databaseUri, ...(isLocal ? {} : { ssl: {} }) })

	// lifecycle: start a clean pool close when the process is told to stop
	// (best-effort — Vite's own signal handler exits shortly after)
	const closePool = () => {
		logger.log("closing mysql pool")
		void pool.end().catch(() => {})
	}
	process.once("SIGINT", closePool)
	process.once("SIGTERM", closePool)

	return drizzle(pool, { schema, mode: "default" })
}

// cached on globalThis so dev-server module reloads reuse the pool instead of
// leaking one (plus a pair of signal listeners) per reload
const g = globalThis as unknown as { __remindlyDb?: ReturnType<typeof createDb> }
export const db = (g.__remindlyDb ??= createDb())
export type DB = typeof db
