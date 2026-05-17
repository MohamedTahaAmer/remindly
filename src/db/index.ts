import { connect } from "@tidbcloud/serverless"
import { drizzle as drizzleTidb } from "drizzle-orm/tidb-serverless"

import * as schema from "./schema.ts"

const url = process.env.DATABASE_URI
if (!url) throw new Error("DATABASE_URI is not set")

const isLocal = /@(localhost|127\.0\.0\.1)/.test(url)

async function makeDb() {
	if (isLocal) {
		const [{ drizzle }, mysqlMod] = await Promise.all([
			import("drizzle-orm/mysql2"),
			import("mysql2/promise"),
		])
		const pool = mysqlMod.default.createPool({ uri: url! })
		return drizzle(pool, { schema, mode: "default" }) as unknown as ReturnType<
			typeof drizzleTidb<typeof schema>
		>
	}
	return drizzleTidb(connect({ url: url! }), { schema })
}

export const db = await makeDb()
