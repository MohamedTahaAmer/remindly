import fs from "node:fs"
import path from "node:path"
import { config as loadDotenv } from "dotenv"
import { z } from "zod"

// Server-side configuration. Vite only exposes VITE_-prefixed vars, so the
// backend loads .env files into process.env itself.
// Everything is anchored to the workspace root (found by walking up from cwd
// to the directory holding bun.lock) so paths stay stable whether the app
// runs from the repo root or from apps/web, bundled or not.
function findWorkspaceRoot(): string {
	let dir = process.cwd()
	for (;;) {
		if (fs.existsSync(path.join(dir, "bun.lock"))) return dir
		const parent = path.dirname(dir)
		if (parent === dir) return process.cwd()
		dir = parent
	}
}

const root = findWorkspaceRoot()
loadDotenv({ path: [path.join(root, ".env.local"), path.join(root, ".env")], quiet: true })

// Validated at startup so a missing/blank var fails fast with a clear message
// instead of a weird downstream error (the Nest ConfigModule-with-schema
// equivalent). Optional features (transcription) stay optional.
const serverConfigSchema = z.object({
	workspaceRoot: z.string().min(1),
	databaseUri: z.string().min(1, "DATABASE_URI is required — set it in .env.local"),
	assemblyAiApiKey: z.string(),
	videoAgentDir: z.string().min(1),
	pastedImagesDir: z.string().min(1),
	pastedTextsDbPath: z.string().min(1),
})

const parsed = serverConfigSchema.safeParse({
	workspaceRoot: root,
	databaseUri: process.env.DATABASE_URI ?? "",
	assemblyAiApiKey: process.env.ASSEMBLYAI_API_KEY ?? "",
	// working files all live under _local/ at the workspace root (gitignored)
	videoAgentDir: path.resolve(root, "_local/video-agent"),
	pastedImagesDir: path.resolve(root, process.env.PHOTOS_BASE_DIR ?? "_local/pasted-images"),
	pastedTextsDbPath: path.resolve(root, process.env.TEXTS_DB_PATH ?? "_local/pasted-texts.db"),
})
if (!parsed.success) {
	const issues = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n")
	throw new Error(`invalid server configuration:\n${issues}`)
}

export const serverConfig = parsed.data
