import { cardsRouter } from "#/server/modules/cards/cards.router"
import { reviewRouter } from "#/server/modules/review/review.router"
import { tagsRouter } from "#/server/modules/tags/tags.router"
import { createTRPCRouter } from "./trpc.ts"

export const appRouter = createTRPCRouter({
	cards: cardsRouter,
	review: reviewRouter,
	tags: tagsRouter,
})
export type TRPCRouter = typeof appRouter
