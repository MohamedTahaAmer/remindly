import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { config as loadDotenv } from "dotenv"

// Server-side configuration. Vite only exposes VITE_-prefixed vars, so the
// backend loads .env files into process.env itself (same as drizzle.config.ts).
loadDotenv({ path: [".env.local", ".env"], quiet: true })

const root = process.cwd()

// AI analysis runs through the installed Claude Code CLI (subscription auth),
// not an API key. The systemd service PATH lacks ~/.local/bin, so resolve the
// binary to an absolute path when possible.
const localClaudeBin = path.join(os.homedir(), ".local/bin/claude")

export const serverConfig = {
	databaseUri: process.env.DATABASE_URI ?? "",
	assemblyAiApiKey: process.env.ASSEMBLYAI_API_KEY ?? "",
	claudeBin: fs.existsSync(localClaudeBin) ? localClaudeBin : "claude",
	// working files all live under _local/ (gitignored), like the paste features
	videoAgentDir: path.resolve(root, "_local/video-agent"),
	pastedImagesDir: path.resolve(root, process.env.PHOTOS_BASE_DIR ?? "_local/pasted-images"),
	pastedTextsDbPath: path.resolve(root, process.env.TEXTS_DB_PATH ?? "_local/pasted-texts.db"),
}
