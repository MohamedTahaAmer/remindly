import { createTRPCRouter } from "./init"
import { cardsRouter } from "./routers/cards"
import { reviewRouter } from "./routers/review"

export const trpcRouter = createTRPCRouter({
	cards: cardsRouter,
	review: reviewRouter,
})
export type TRPCRouter = typeof trpcRouter
