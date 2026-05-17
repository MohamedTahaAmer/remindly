/* eslint-disable @typescript-eslint/no-unnecessary-condition -- tidb-serverless drizzle adapter types select results as non-nullable, but empty rowsets are real */
import { z } from "zod"
import { and, desc, eq, lte, ne, sql } from "drizzle-orm"
import type { TRPCRouterRecord } from "@trpc/server"
import { TRPCError } from "@trpc/server"

import { publicProcedure } from "../init"
import { db } from "#/db"
import { cards } from "#/db/schema"
import { parseMarkdown } from "#/lib/markdown"

const cardInput = z.object({
	front: z.string().min(1).max(500),
	back: z.string().min(1),
	detailsMarkdown: z.string().nullable().optional(),
})

export const cardsRouter = {
	list: publicProcedure.query(async () => {
		return db.select().from(cards).orderBy(desc(cards.createdAt))
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
	dueToday: publicProcedure.input(z.object({ extraRandom: z.number().int().min(0).max(20).default(3) }).optional()).query(async ({ input }) => {
		const extraRandom = input?.extraRandom ?? 3
		const now = new Date()

		const due = await db.select().from(cards).where(lte(cards.scheduledFor, now)).orderBy(cards.scheduledFor)
		const dueIds = new Set(due.map((c) => c.id))

		let random: typeof due = []
		if (extraRandom > 0) {
			const all = await db
				.select()
				.from(cards)
				.where(and(...(dueIds.size ? [ne(cards.id, -1)] : [])))
				.orderBy(sql`RAND()`)
				.limit(extraRandom + dueIds.size)
			random = all.filter((c) => !dueIds.has(c.id)).slice(0, extraRandom)
		}

		return { due, random }
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
