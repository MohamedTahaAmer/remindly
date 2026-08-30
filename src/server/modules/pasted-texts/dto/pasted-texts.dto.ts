import { z } from "zod"

export const pastedTextSchema = z.object({
	id: z.number().int(),
	text: z.string(),
	createdAt: z.string(),
})
export type PastedText = z.infer<typeof pastedTextSchema>

export const pastedTextListOutputSchema = z.array(pastedTextSchema)

export const pastedTextCreateInputSchema = z.object({ text: z.string().trim().min(1) })
export const pastedTextCreateOutputSchema = z.object({ id: z.number().int() })

export const pastedTextDeleteInputSchema = z.object({ id: z.number().int() })
