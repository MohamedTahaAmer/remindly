import { createTRPCRouter } from "./init"
import { cardsRouter } from "./routers/cards"
import { reviewRouter } from "./routers/review"
import { tagsRouter } from "./routers/tags"

export const trpcRouter = createTRPCRouter({
	cards: cardsRouter,
	review: reviewRouter,
	tags: tagsRouter,
})
export type TRPCRouter = typeof trpcRouter
