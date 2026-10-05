import fs from "node:fs"
import path from "node:path"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"
import { TRPCError } from "@trpc/server"

import { serverConfig } from "@remindly/config"
import { EXT_TO_MIME } from "./pasted-images.constants.ts"

/**
 * Image paste box (/pi). Files live outside the app build on this machine's
 * disk, in PHOTOS_BASE_DIR (falling back to _local/pasted-images).
 */
export class PastedImagesService {
	private get dir() {
		return serverConfig.pastedImagesDir
	}

	/** null for names that fail the traversal guard or don't exist. */
	fileOf(name: string): string | null {
		const file = path.join(this.dir, name)
		if (name.includes("/") || name.includes("..") || !fs.existsSync(file)) return null
		return file
	}

	list(): Array<string> {
		fs.mkdirSync(this.dir, { recursive: true })
		return fs
			.readdirSync(this.dir)
			.filter((name) => path.extname(name).slice(1) in EXT_TO_MIME)
			.map((name) => ({ name, mtime: fs.statSync(path.join(this.dir, name)).mtimeMs }))
			.sort((a, b) => b.mtime - a.mtime)
			.map((f) => f.name)
	}

	/** Streams the body to disk (videos can be large); false — and nothing kept — when it was empty. */
	async save(name: string, body: ReadableStream): Promise<boolean> {
		fs.mkdirSync(this.dir, { recursive: true })
		const file = path.join(this.dir, name)
		await pipeline(Readable.fromWeb(body as never), fs.createWriteStream(file))
		if (fs.statSync(file).size > 0) return true
		fs.unlinkSync(file)
		return false
	}

	delete(name: string) {
		const file = this.fileOf(name)
		if (!file) throw new TRPCError({ code: "NOT_FOUND", message: "image not found" })
		fs.unlinkSync(file)
		return { ok: true } as const
	}
}

export const pastedImagesService = new PastedImagesService()
