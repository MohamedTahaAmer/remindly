import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import { config } from "dotenv"
import { eq } from "drizzle-orm"
import { db } from "#/db"
import { cards } from "#/db/schema"

config({ path: [".env.local", ".env"] })

type SeedCard = {
	front: string
	back: string
	detailsMarkdown: string | null
}

const CONTENT_DIR = join(process.cwd(), "content")

// File format:
//   # <front — inline markdown title>
//
//   <back paragraph(s)>
//
//   ---
//
//   <everything below is detailsMarkdown — optional>
function parseCard(source: string, filename: string): SeedCard {
	const lines = source.replace(/\r\n/g, "\n").split("\n")
	const firstNonBlank = lines.findIndex((l) => l.trim() !== "")
	if (firstNonBlank === -1) throw new Error(`${filename}: empty file`)

	const titleLine = lines[firstNonBlank]
	const titleMatch = /^#\s+(.+?)\s*$/.exec(titleLine)
	if (!titleMatch) throw new Error(`${filename}: first non-blank line must be '# <front>'`)
	const front = titleMatch[1]

	const rest = lines.slice(firstNonBlank + 1)
	const sepIdx = rest.findIndex((l) => /^---\s*$/.test(l))

	const backLines = sepIdx === -1 ? rest : rest.slice(0, sepIdx)
	const detailsLines = sepIdx === -1 ? [] : rest.slice(sepIdx + 1)

	const back = backLines.join("\n").trim()
	const details = detailsLines.join("\n").trim()

	if (!back) throw new Error(`${filename}: missing 'back' section between title and '---'`)

	return { front, back, detailsMarkdown: details || null }
}

async function loadSeeds(): Promise<SeedCard[]> {
	const entries = await readdir(CONTENT_DIR)
	const files = entries.filter((f) => f.endsWith(".md")).sort()
	const out: SeedCard[] = []
	for (const f of files) {
		const source = await readFile(join(CONTENT_DIR, f), "utf8")
		out.push(parseCard(source, f))
	}
	return out
}

const seeds = await loadSeeds()
console.log(`Found ${seeds.length} card(s) in ${CONTENT_DIR}`)

let inserted = 0
let updated = 0

for (const c of seeds) {
	const [existing] = await db.select({ id: cards.id }).from(cards).where(eq(cards.front, c.front)).limit(1)

	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- tidb-serverless types select rows as non-nullable, but the array can be empty
	if (existing?.id) {
		await db.update(cards).set({ back: c.back, detailsMarkdown: c.detailsMarkdown }).where(eq(cards.id, existing.id))
		console.log(`Updated card #${existing.id}: ${c.front}`)
		updated++
	} else {
		const [res] = await db
			.insert(cards)
			.values({
				front: c.front,
				back: c.back,
				detailsMarkdown: c.detailsMarkdown,
			})
			.$returningId()
		console.log(`Inserted card #${res.id}: ${c.front}`)
		inserted++
	}
}

console.log(`\nDone. ${inserted} inserted, ${updated} updated.`)
process.exit(0)
