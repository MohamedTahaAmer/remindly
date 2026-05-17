import { config } from "dotenv"
import { defineConfig } from "drizzle-kit"

config({ path: [".env.local", ".env"] })

const raw = process.env.DATABASE_URI!
const u = new URL(raw)
const needsSsl = !["localhost", "127.0.0.1"].includes(u.hostname)

export default defineConfig({
	out: "./drizzle",
	schema: "./src/db/schema.ts",
	dialect: "mysql",
	dbCredentials: {
		host: u.hostname,
		port: u.port ? Number(u.port) : 3306,
		user: decodeURIComponent(u.username),
		password: decodeURIComponent(u.password),
		database: u.pathname.replace(/^\//, ""),
		...(needsSsl ? { ssl: {} } : {}),
	},
})
