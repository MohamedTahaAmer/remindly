import { mysqlTable, int, varchar, text, timestamp, mysqlEnum, index } from "drizzle-orm/mysql-core"
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

export const cardsRelations = relations(cards, ({ many }) => ({
	reviews: many(cardReviews),
}))

export const cardReviewsRelations = relations(cardReviews, ({ one }) => ({
	card: one(cards, { fields: [cardReviews.cardId], references: [cards.id] }),
}))
