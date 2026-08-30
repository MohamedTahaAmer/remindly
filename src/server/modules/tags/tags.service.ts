/* eslint-disable @typescript-eslint/no-unnecessary-condition -- drizzle types select results as non-nullable, but empty rowsets are real */
import { eq, sql } from "drizzle-orm"
import { TRPCError } from "@trpc/server"

import { db } from "#/server/infrastructure/database/database"
import { cardTags, tags } from "#/server/infrastructure/database/schema"

export class TagsService {
	// All tags with how many cards carry each, alphabetical.
	async list() {
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
	}

	async create(rawName: string) {
		const name = rawName.trim().toLowerCase()
		const [existing] = await db.select({ id: tags.id }).from(tags).where(eq(tags.name, name)).limit(1)
		if (existing?.id) throw new TRPCError({ code: "CONFLICT", message: `Tag "${name}" already exists` })
		const [res] = await db.insert(tags).values({ name }).$returningId()
		return { id: res.id, name }
	}

	// Deleting a tag detaches it from its cards; the cards themselves are untouched.
	async delete(id: number) {
		await db.delete(cardTags).where(eq(cardTags.tagId, id))
		await db.delete(tags).where(eq(tags.id, id))
		return { ok: true }
	}
}

export const tagsService = new TagsService()
