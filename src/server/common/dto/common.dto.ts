import { z } from "zod"

export const okOutputSchema = z.object({ ok: z.literal(true) })
export type OkOutput = z.infer<typeof okOutputSchema>
