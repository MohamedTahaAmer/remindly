import { cardsRouter } from "#/server/modules/cards/cards.router"
import { pastedImagesRouter } from "#/server/modules/pasted-images/pasted-images.router"
import { pastedTextsRouter } from "#/server/modules/pasted-texts/pasted-texts.router"
import { reviewRouter } from "#/server/modules/review/review.router"
import { tagsRouter } from "#/server/modules/tags/tags.router"
import { videoAgentRouter } from "#/server/modules/video-agent/video-agent.router"
import { createTRPCRouter } from "./trpc.ts"

export const appRouter = createTRPCRouter({
	cards: cardsRouter,
	pastedImages: pastedImagesRouter,
	pastedTexts: pastedTextsRouter,
	review: reviewRouter,
	tags: tagsRouter,
	videoAgent: videoAgentRouter,
})
export type TRPCRouter = typeof appRouter
