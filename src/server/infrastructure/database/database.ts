import { drizzle } from "drizzle-orm/mysql2"
import mysql from "mysql2/promise"

import { serverConfig } from "../config/config.ts"
import * as schema from "./schema.ts"

if (!serverConfig.databaseUri) throw new Error("DATABASE_URI is not set")

// TiDB Cloud speaks the MySQL protocol but requires TLS; local MySQL doesn't.
const isLocal = /@(localhost|127\.0\.0\.1)/.test(serverConfig.databaseUri)
const pool = mysql.createPool({ uri: serverConfig.databaseUri, ...(isLocal ? {} : { ssl: {} }) })

export const db = drizzle(pool, { schema, mode: "default" })
export type DB = typeof db
