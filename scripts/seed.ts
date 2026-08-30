import { readdir, readFile } from "node:fs/promises"
import { join, relative } from "node:path"
import { config } from "dotenv"
import { and, eq, inArray } from "drizzle-orm"
import { db } from "#/db"
import { cardTags, cards, tags } from "#/db/schema"

config({ path: [".env.local", ".env"] })

type SeedCard = {
	front: string
	back: string
	detailsMarkdown: string | null
	tags: string[]
}

const CONTENT_DIR = join(process.cwd(), "content")

// Card format:
//   # <front — inline markdown title>
//
//   tags: <comma-separated tag names — optional>
//
//   <back paragraph(s)>
//
//   ---
//
//   <everything below is detailsMarkdown — optional>
//
// A file holds one card, or several separated by lines of `===` (three or more).
function parseCard(source: string, filename: string): SeedCard {
	const lines = source.replace(/\r\n/g, "\n").split("\n")
	const firstNonBlank = lines.findIndex((l) => l.trim() !== "")
	if (firstNonBlank === -1) throw new Error(`${filename}: empty file`)

	const titleLine = lines[firstNonBlank]
	const titleMatch = /^#\s+(.+?)\s*$/.exec(titleLine)
	if (!titleMatch) throw new Error(`${filename}: first non-blank line must be '# <front>'`)
	const front = titleMatch[1]

	let rest = lines.slice(firstNonBlank + 1)

	// Optional "tags: a, b, c" line directly under the title (blank lines allowed in between).
	let tagNames: string[] = []
	const tagsLineIdx = rest.findIndex((l) => l.trim() !== "")
	if (tagsLineIdx !== -1) {
		const tagsMatch = /^tags:\s*(.+)$/i.exec(rest[tagsLineIdx].trim())
		if (tagsMatch) {
			tagNames = tagsMatch[1]
				.split(",")
				.map((t) => t.trim().toLowerCase())
				.filter(Boolean)
			rest = rest.slice(tagsLineIdx + 1)
		}
	}

	const sepIdx = rest.findIndex((l) => /^---\s*$/.test(l))

	const backLines = sepIdx === -1 ? rest : rest.slice(0, sepIdx)
	const detailsLines = sepIdx === -1 ? [] : rest.slice(sepIdx + 1)

	const back = backLines.join("\n").trim()
	const details = detailsLines.join("\n").trim()

	if (!back) throw new Error(`${filename}: missing 'back' section between title and '---'`)

	return { front, back, detailsMarkdown: details || null, tags: tagNames }
}

// Get-or-create each tag name, returning its id.
async function ensureTags(names: string[]): Promise<Map<string, number>> {
	const ids = new Map<string, number>()
	for (const name of names) {
		const [existing] = await db.select({ id: tags.id }).from(tags).where(eq(tags.name, name)).limit(1)
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- empty rowsets are real
		if (existing?.id) {
			ids.set(name, existing.id)
		} else {
			const [res] = await db.insert(tags).values({ name }).$returningId()
			ids.set(name, res.id)
			console.log(`Created tag "${name}" (#${res.id})`)
		}
	}
	return ids
}

// Make the card's tag links match the file's tags exactly.
async function syncCardTags(cardId: number, tagIds: number[]) {
	const existing = await db.select({ tagId: cardTags.tagId }).from(cardTags).where(eq(cardTags.cardId, cardId))
	const have = new Set(existing.map((r) => r.tagId))
	const want = new Set(tagIds)
	const toAdd = tagIds.filter((id) => !have.has(id))
	const toRemove = [...have].filter((id) => !want.has(id))
	if (toAdd.length) await db.insert(cardTags).values(toAdd.map((tagId) => ({ cardId, tagId })))
	if (toRemove.length) await db.delete(cardTags).where(and(eq(cardTags.cardId, cardId), inArray(cardTags.tagId, toRemove)))
}

// Split a file into card sections on `===` separator lines (single-card files have none).
function parseFile(source: string, filename: string): SeedCard[] {
	const sections = source.replace(/\r\n/g, "\n").split(/^={3,}\s*$/m)
	const nonEmpty = sections.filter((s) => s.trim() !== "")
	if (!nonEmpty.length) throw new Error(`${filename}: empty file`)
	return nonEmpty.map((s, i) => parseCard(s, nonEmpty.length > 1 ? `${filename} (card ${i + 1})` : filename))
}

// Content files are named NNNN_slug.md (4-digit number, then the slug),
// either directly in content/ or nested in subfolders.
const FILENAME_RE = /^\d{4}_.+\.md$/

async function loadSeeds(): Promise<SeedCard[]> {
	const entries = await readdir(CONTENT_DIR, { recursive: true, withFileTypes: true })
	const mdFiles = entries.filter((e) => e.isFile() && e.name.endsWith(".md"))
	const bad = mdFiles.filter((f) => !FILENAME_RE.test(f.name))
	if (bad.length)
		throw new Error(
			`content file(s) not matching NNNN_slug.md: ${bad.map((f) => relative(CONTENT_DIR, join(f.parentPath, f.name))).join(", ")}`,
		)
	const paths = mdFiles.map((f) => join(f.parentPath, f.name)).sort()
	const out: SeedCard[] = []
	for (const p of paths) {
		const source = await readFile(p, "utf8")
		out.push(...parseFile(source, relative(CONTENT_DIR, p)))
	}
	return out
}

const seeds = await loadSeeds()
console.log(`Found ${seeds.length} card(s) in ${CONTENT_DIR}`)

let inserted = 0
let updated = 0

const allTagNames = [...new Set(seeds.flatMap((s) => s.tags))]
const tagIdsByName = await ensureTags(allTagNames)

for (const c of seeds) {
	const [existing] = await db.select({ id: cards.id }).from(cards).where(eq(cards.front, c.front)).limit(1)

	let cardId: number
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- tidb-serverless types select rows as non-nullable, but the array can be empty
	if (existing?.id) {
		await db.update(cards).set({ back: c.back, detailsMarkdown: c.detailsMarkdown }).where(eq(cards.id, existing.id))
		cardId = existing.id
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
		cardId = res.id
		console.log(`Inserted card #${res.id}: ${c.front}`)
		inserted++
	}

	await syncCardTags(
		cardId,
		c.tags.map((name) => tagIdsByName.get(name)!),
	)
}

console.log(`\nDone. ${inserted} inserted, ${updated} updated.`)
process.exit(0)
