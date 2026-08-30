import { createSelectSchema } from "drizzle-zod"
import { z } from "zod"

import { cards } from "#/server/infrastructure/database/schema"

export const cardSchema = createSelectSchema(cards)
export const tagRefSchema = z.object({ id: z.number().int(), name: z.string() })
export const cardWithTagsSchema = cardSchema.extend({ tags: z.array(tagRefSchema) })

const cardIdInputSchema = z.object({ id: z.number().int() })

export const tagFilterInputSchema = z.object({
	tagIds: z.array(z.number().int()).optional(),
	match: z.enum(["any", "all"]).default("any"),
})
export type TagFilterInput = z.infer<typeof tagFilterInputSchema>

export const cardListInputSchema = tagFilterInputSchema.optional()
export const cardListOutputSchema = z.array(cardWithTagsSchema)

export const cardGetInputSchema = cardIdInputSchema
export const cardGetOutputSchema = cardSchema

export const cardDetailsInputSchema = cardIdInputSchema
export const cardDetailsOutputSchema = z.object({ detailsHtml: z.string().nullable() })

export const cardCreateInputSchema = z.object({
	front: z.string().min(1).max(500),
	back: z.string().min(1),
	detailsMarkdown: z.string().nullable().optional(),
})
export type CardInput = z.infer<typeof cardCreateInputSchema>
export const cardCreateOutputSchema = z.object({ id: z.number().int() })

export const cardUpdateInputSchema = cardCreateInputSchema.extend({ id: z.number().int() })

export const cardDeleteInputSchema = cardIdInputSchema

export const cardDueTodayInputSchema = tagFilterInputSchema.extend({ extraRandom: z.number().int().min(0).max(20).default(3) }).optional()
export type DueTodayInput = z.infer<typeof cardDueTodayInputSchema>
export const cardDueTodayOutputSchema = z.object({ due: z.array(cardWithTagsSchema), random: z.array(cardWithTagsSchema) })

export const cardSurpriseInputSchema = z.object({ n: z.number().int().min(1).max(20).default(5) }).optional()
export const cardSurpriseOutputSchema = z.array(cardSchema)
