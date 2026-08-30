import { z } from "zod"

export const tagListOutputSchema = z.array(
	z.object({
		id: z.number().int(),
		name: z.string(),
		cardCount: z.number(),
	}),
)

export const tagCreateInputSchema = z.object({ name: z.string().trim().min(1).max(100) })
export const tagCreateOutputSchema = z.object({ id: z.number().int(), name: z.string() })

export const tagDeleteInputSchema = z.object({ id: z.number().int() })
