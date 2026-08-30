import { z } from "zod"

export const cardInputSchema = z.object({
	front: z.string().min(1).max(500),
	back: z.string().min(1),
	detailsMarkdown: z.string().nullable().optional(),
})
export type CardInput = z.infer<typeof cardInputSchema>

export const tagFilterInputSchema = z.object({
	tagIds: z.array(z.number().int()).optional(),
	match: z.enum(["any", "all"]).default("any"),
})
export type TagFilterInput = z.infer<typeof tagFilterInputSchema>

export const dueTodayInputSchema = tagFilterInputSchema.extend({
	extraRandom: z.number().int().min(0).max(20).default(3),
})
export type DueTodayInput = z.infer<typeof dueTodayInputSchema>
