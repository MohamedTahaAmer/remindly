import { z } from "zod"

export const pastedImageListOutputSchema = z.array(z.string())

export const pastedImageDeleteInputSchema = z.object({ name: z.string() })
