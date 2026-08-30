/* eslint-disable @typescript-eslint/no-unnecessary-condition -- tidb-serverless drizzle adapter types select results as non-nullable, but empty rowsets are real */
import { z } from "zod"
import { eq, sql } from "drizzle-orm"
import { TRPCError } from "@trpc/server"
import type { TRPCRouterRecord } from "@trpc/server"

import { publicProcedure } from "../init"
import { db } from "#/db"
import { cardTags, tags } from "#/db/schema"

export const tagsRouter = {
	// All tags with how many cards carry each, alphabetical.
	list: publicProcedure.query(async () => {
		return db
			.select({
				id: tags.id,
				name: tags.name,
				cardCount: sql<number>`count(${cardTags.cardId})`.mapWith(Number),
			})
			.from(tags)
			.leftJoin(cardTags, eq(cardTags.tagId, tags.id))
			.groupBy(tags.id, tags.name)
			.orderBy(tags.name)
	}),

	create: publicProcedure.input(z.object({ name: z.string().trim().min(1).max(100) })).mutation(async ({ input }) => {
		const name = input.name.trim().toLowerCase()
		const [existing] = await db.select({ id: tags.id }).from(tags).where(eq(tags.name, name)).limit(1)
		if (existing?.id) throw new TRPCError({ code: "CONFLICT", message: `Tag "${name}" already exists` })
		const [res] = await db.insert(tags).values({ name }).$returningId()
		return { id: res.id, name }
	}),

	// Deleting a tag detaches it from its cards; the cards themselves are untouched.
	delete: publicProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input }) => {
		await db.delete(cardTags).where(eq(cardTags.tagId, input.id))
		await db.delete(tags).where(eq(tags.id, input.id))
		return { ok: true }
	}),
} satisfies TRPCRouterRecord
