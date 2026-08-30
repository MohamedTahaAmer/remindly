/* eslint-disable @typescript-eslint/no-unnecessary-condition -- tidb-serverless drizzle adapter types select results as non-nullable, but empty rowsets are real */
import { z } from "zod"
import { and, desc, eq, inArray, lte, ne, sql } from "drizzle-orm"
import type { SQL } from "drizzle-orm"
import type { TRPCRouterRecord } from "@trpc/server"
import { TRPCError } from "@trpc/server"

import { publicProcedure } from "../init"
import { db } from "#/db"
import { cardTags, cards, tags } from "#/db/schema"
import { parseMarkdown } from "#/lib/markdown"

const cardInput = z.object({
	front: z.string().min(1).max(500),
	back: z.string().min(1),
	detailsMarkdown: z.string().nullable().optional(),
})

const tagFilterInput = z.object({
	tagIds: z.array(z.number().int()).optional(),
	match: z.enum(["any", "all"]).default("any"),
})

// SQL condition restricting cards to the selected tags —
// "any": card has at least one of them; "all": card has every one.
function tagFilter(tagIds: number[], match: "any" | "all"): SQL {
	const sub =
		match === "all"
			? db
					.select({ cardId: cardTags.cardId })
					.from(cardTags)
					.where(inArray(cardTags.tagId, tagIds))
					.groupBy(cardTags.cardId)
					.having(sql`count(distinct ${cardTags.tagId}) = ${tagIds.length}`)
			: db.select({ cardId: cardTags.cardId }).from(cardTags).where(inArray(cardTags.tagId, tagIds))
	return inArray(cards.id, sub)
}

// Attach each card's tags ({id, name}[]) for chip rendering.
async function withTags<T extends { id: number }>(rows: T[]) {
	if (!rows.length) return rows.map((r) => ({ ...r, tags: [] as { id: number; name: string }[] }))
	const links = await db
		.select({ cardId: cardTags.cardId, id: tags.id, name: tags.name })
		.from(cardTags)
		.innerJoin(tags, eq(tags.id, cardTags.tagId))
		.where(
			inArray(
				cardTags.cardId,
				rows.map((r) => r.id),
			),
		)
	const byCard = new Map<number, { id: number; name: string }[]>()
	for (const l of links) {
		const arr = byCard.get(l.cardId) ?? []
		arr.push({ id: l.id, name: l.name })
		byCard.set(l.cardId, arr)
	}
	return rows.map((r) => ({ ...r, tags: (byCard.get(r.id) ?? []).sort((a, b) => a.name.localeCompare(b.name)) }))
}

export const cardsRouter = {
	list: publicProcedure.input(tagFilterInput.optional()).query(async ({ input }) => {
		const tagIds = input?.tagIds ?? []
		const where = tagIds.length ? tagFilter(tagIds, input?.match ?? "any") : undefined
		const rows = await db.select().from(cards).where(where).orderBy(desc(cards.createdAt))
		return withTags(rows)
	}),

	get: publicProcedure.input(z.object({ id: z.number().int() })).query(async ({ input }) => {
		const [row] = await db.select().from(cards).where(eq(cards.id, input.id)).limit(1)
		if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Card not found" })
		return row
	}),

	details: publicProcedure.input(z.object({ id: z.number().int() })).query(async ({ input }) => {
		const [row] = await db.select().from(cards).where(eq(cards.id, input.id)).limit(1)
		if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Card not found" })
		const detailsHtml = row.detailsMarkdown ? await parseMarkdown(row.detailsMarkdown) : null
		return { detailsHtml }
	}),

	create: publicProcedure.input(cardInput).mutation(async ({ input }) => {
		const [res] = await db
			.insert(cards)
			.values({
				front: input.front,
				back: input.back,
				detailsMarkdown: input.detailsMarkdown ?? null,
			})
			.$returningId()
		return { id: res.id }
	}),

	update: publicProcedure.input(cardInput.extend({ id: z.number().int() })).mutation(async ({ input }) => {
		await db
			.update(cards)
			.set({
				front: input.front,
				back: input.back,
				detailsMarkdown: input.detailsMarkdown ?? null,
			})
			.where(eq(cards.id, input.id))
		return { ok: true }
	}),

	delete: publicProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input }) => {
		await db.delete(cards).where(eq(cards.id, input.id))
		return { ok: true }
	}),

	// Cards whose next review is due, plus K random non-due "surprise" cards.
	dueToday: publicProcedure
		.input(tagFilterInput.extend({ extraRandom: z.number().int().min(0).max(20).default(3) }).optional())
		.query(async ({ input }) => {
			const extraRandom = input?.extraRandom ?? 3
			const now = new Date()
			const tagIds = input?.tagIds ?? []
			const tagCond = tagIds.length ? tagFilter(tagIds, input?.match ?? "any") : undefined

			const due = await db
				.select()
				.from(cards)
				.where(and(lte(cards.scheduledFor, now), tagCond))
				.orderBy(desc(cards.createdAt))
			const dueIds = new Set(due.map((c) => c.id))

			let random: typeof due = []
			if (extraRandom > 0) {
				const all = await db
					.select()
					.from(cards)
					.where(and(...(tagCond ? [tagCond] : []), ...(dueIds.size ? [ne(cards.id, -1)] : [])))
					.orderBy(sql`RAND()`)
					.limit(extraRandom + dueIds.size)
				random = all.filter((c) => !dueIds.has(c.id)).slice(0, extraRandom)
			}

			return { due: await withTags(due), random: await withTags(random) }
		}),

	// Ad-hoc "surprise me" — N random cards regardless of schedule.
	surprise: publicProcedure.input(z.object({ n: z.number().int().min(1).max(20).default(5) }).optional()).query(async ({ input }) => {
		const n = input?.n ?? 5
		return db
			.select()
			.from(cards)
			.orderBy(sql`RAND()`)
			.limit(n)
	}),
} satisfies TRPCRouterRecord
