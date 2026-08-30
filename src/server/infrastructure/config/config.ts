import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { config as loadDotenv } from "dotenv"
import { z } from "zod"

// Server-side configuration. Vite only exposes VITE_-prefixed vars, so the
// backend loads .env files into process.env itself (same as drizzle.config.ts).
loadDotenv({ path: [".env.local", ".env"], quiet: true })

const root = process.cwd()

// AI analysis runs through the installed Claude Code CLI (subscription auth),
// not an API key. The systemd service PATH lacks ~/.local/bin, so resolve the
// binary to an absolute path when possible.
const localClaudeBin = path.join(os.homedir(), ".local/bin/claude")

// Validated at startup so a missing/blank var fails fast with a clear message
// instead of a weird downstream error (the Nest ConfigModule-with-schema
// equivalent). Optional features (transcription) stay optional.
const serverConfigSchema = z.object({
	databaseUri: z.string().min(1, "DATABASE_URI is required — set it in .env.local"),
	assemblyAiApiKey: z.string(),
	claudeBin: z.string().min(1),
	videoAgentDir: z.string().min(1),
	pastedImagesDir: z.string().min(1),
	pastedTextsDbPath: z.string().min(1),
})

const parsed = serverConfigSchema.safeParse({
	databaseUri: process.env.DATABASE_URI ?? "",
	assemblyAiApiKey: process.env.ASSEMBLYAI_API_KEY ?? "",
	claudeBin: fs.existsSync(localClaudeBin) ? localClaudeBin : "claude",
	// working files all live under _local/ (gitignored), like the paste features
	videoAgentDir: path.resolve(root, "_local/video-agent"),
	pastedImagesDir: path.resolve(root, process.env.PHOTOS_BASE_DIR ?? "_local/pasted-images"),
	pastedTextsDbPath: path.resolve(root, process.env.TEXTS_DB_PATH ?? "_local/pasted-texts.db"),
})
if (!parsed.success) {
	const issues = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n")
	throw new Error(`invalid server configuration:\n${issues}`)
}

export const serverConfig = parsed.data
