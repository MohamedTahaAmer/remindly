import { drizzle } from "drizzle-orm/mysql2"
import mysql from "mysql2/promise"

import * as schema from "./schema.ts"

const url = process.env.DATABASE_URI
if (!url) throw new Error("DATABASE_URI is not set")

const needsSsl = !/@(localhost|127\.0\.0\.1)/.test(url)
const pool = mysql.createPool({
	uri: url,
	...(needsSsl ? { ssl: { minVersion: "TLSv1.2" } } : {}),
})

export const db = drizzle(pool, { schema, mode: "default" })
