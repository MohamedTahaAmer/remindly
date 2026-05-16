import { drizzle } from "drizzle-orm/mysql2"

import * as schema from "./schema.ts"

const url = process.env.DATABASE_URI
if (!url) throw new Error("DATABASE_URI is not set")

export const db = drizzle(url, { schema, mode: "default" })
