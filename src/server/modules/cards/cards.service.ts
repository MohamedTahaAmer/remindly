/* eslint-disable @typescript-eslint/no-unnecessary-condition -- drizzle types select results as non-nullable, but empty rowsets are real */
import { and, desc, eq, inArray, lte, ne, sql } from "drizzle-orm"
import type { SQL } from "drizzle-orm"
import { TRPCError } from "@trpc/server"

import { db } from "#/server/infrastructure/database/database"
import { cardTags, cards, tags } from "#/server/infrastructure/database/schema"
import { parseMarkdown } from "#/lib/markdown"
import type { CardInput, DueTodayInput, TagFilterInput } from "./schema/cards.schema.ts"

export class CardsService {
	// SQL condition restricting cards to the selected tags —
	// "any": card has at least one of them; "all": card has every one.
	private tagFilter(tagIds: number[], match: "any" | "all"): SQL {
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
	private async withTags<T extends { id: number }>(rows: T[]) {
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

	async list(input: TagFilterInput | undefined) {
		const tagIds = input?.tagIds ?? []
		const where = tagIds.length ? this.tagFilter(tagIds, input?.match ?? "any") : undefined
		const rows = await db.select().from(cards).where(where).orderBy(desc(cards.createdAt))
		return this.withTags(rows)
	}

	async get(id: number) {
		const [row] = await db.select().from(cards).where(eq(cards.id, id)).limit(1)
		if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Card not found" })
		return row
	}

	async details(id: number) {
		const row = await this.get(id)
		const detailsHtml = row.detailsMarkdown ? await parseMarkdown(row.detailsMarkdown) : null
		return { detailsHtml }
	}

	async create(input: CardInput) {
		const [res] = await db
			.insert(cards)
			.values({
				front: input.front,
				back: input.back,
				detailsMarkdown: input.detailsMarkdown ?? null,
			})
			.$returningId()
		return { id: res.id }
	}

	async update(input: CardInput & { id: number }) {
		await db
			.update(cards)
			.set({
				front: input.front,
				back: input.back,
				detailsMarkdown: input.detailsMarkdown ?? null,
			})
			.where(eq(cards.id, input.id))
		return { ok: true }
	}

	async delete(id: number) {
		await db.delete(cards).where(eq(cards.id, id))
		return { ok: true }
	}

	// Cards whose next review is due, plus K random non-due "surprise" cards.
	async dueToday(input: DueTodayInput | undefined) {
		const extraRandom = input?.extraRandom ?? 3
		const now = new Date()
		const tagIds = input?.tagIds ?? []
		const tagCond = tagIds.length ? this.tagFilter(tagIds, input?.match ?? "any") : undefined

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

		return { due: await this.withTags(due), random: await this.withTags(random) }
	}

	// Ad-hoc "surprise me" — N random cards regardless of schedule.
	async surprise(n: number) {
		return db
			.select()
			.from(cards)
			.orderBy(sql`RAND()`)
			.limit(n)
	}
}

export const cardsService = new CardsService()
