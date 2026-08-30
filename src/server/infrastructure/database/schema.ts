import { mysqlTable, int, varchar, text, timestamp, mysqlEnum, index, primaryKey, uniqueIndex } from "drizzle-orm/mysql-core"
import { relations } from "drizzle-orm"

export const cards = mysqlTable(
	"cards",
	{
		id: int().primaryKey().autoincrement(),
		front: varchar({ length: 500 }).notNull(),
		back: text().notNull(),
		detailsMarkdown: text("details_markdown"),
		intervalIndex: int("interval_index").notNull().default(0),
		scheduledFor: timestamp("scheduled_for", { mode: "date" }).notNull().defaultNow(),
		createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow().onUpdateNow(),
	},
	(t) => [index("idx_scheduled_for").on(t.scheduledFor)],
)

export const reviewRatingEnum = ["again", "hard", "good", "easy"] as const
export type ReviewRating = (typeof reviewRatingEnum)[number]

export const cardReviews = mysqlTable(
	"card_reviews",
	{
		id: int().primaryKey().autoincrement(),
		cardId: int("card_id").notNull(),
		rating: mysqlEnum("rating", reviewRatingEnum).notNull(),
		intervalIndexBefore: int("interval_index_before").notNull(),
		intervalIndexAfter: int("interval_index_after").notNull(),
		scheduledFor: timestamp("scheduled_for", { mode: "date" }).notNull(),
		reviewedAt: timestamp("reviewed_at", { mode: "date" }).notNull().defaultNow(),
	},
	(t) => [index("idx_card_id").on(t.cardId)],
)

export const tags = mysqlTable(
	"tags",
	{
		id: int().primaryKey().autoincrement(),
		name: varchar({ length: 100 }).notNull(),
		createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
	},
	(t) => [uniqueIndex("uq_tag_name").on(t.name)],
)

// Many-to-many: a card can have many tags, a tag many cards.
// Deleting a tag only removes its rows here — cards stay.
export const cardTags = mysqlTable(
	"card_tags",
	{
		cardId: int("card_id").notNull(),
		tagId: int("tag_id").notNull(),
	},
	(t) => [primaryKey({ columns: [t.cardId, t.tagId] }), index("idx_tag_id").on(t.tagId)],
)

export const cardsRelations = relations(cards, ({ many }) => ({
	reviews: many(cardReviews),
	cardTags: many(cardTags),
}))

export const tagsRelations = relations(tags, ({ many }) => ({
	cardTags: many(cardTags),
}))

export const cardTagsRelations = relations(cardTags, ({ one }) => ({
	card: one(cards, { fields: [cardTags.cardId], references: [cards.id] }),
	tag: one(tags, { fields: [cardTags.tagId], references: [tags.id] }),
}))

export const cardReviewsRelations = relations(cardReviews, ({ one }) => ({
	card: one(cards, { fields: [cardReviews.cardId], references: [cards.id] }),
}))
