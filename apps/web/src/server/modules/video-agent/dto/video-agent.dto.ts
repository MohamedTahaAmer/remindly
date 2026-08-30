import { z } from "zod"

// times are seconds
export const wordSchema = z.object({ text: z.string(), start: z.number(), end: z.number(), confidence: z.number() })
export type Word = z.infer<typeof wordSchema>

export const spanSchema = z.object({ start: z.number(), end: z.number() })
export type Span = z.infer<typeof spanSchema>

export const aiCutSchema = z.object({
	firstWord: z.number().int(),
	lastWord: z.number().int(),
	reason: z.enum(["repeated_word", "repeated_sentence", "false_start", "retake", "filler"]),
	text: z.string(),
	confidence: z.enum(["high", "medium", "low"]),
	// filled in server-side from word times
	start: z.number(),
	end: z.number(),
})
export type AiCut = z.infer<typeof aiCutSchema>

export const projectStateSchema = z.object({
	id: z.string(),
	name: z.string(),
	createdAt: z.string(),
	status: z.enum(["processing", "ready", "error"]),
	step: z.enum(["saving", "probing", "extracting-audio", "detecting-silence", "transcribing", "done"]),
	error: z.string().optional(),
	duration: z.number(),
	hasAudio: z.boolean(),
	silences: z.array(spanSchema),
	// null => no transcript (missing key or ASR failure); transcriptError says why
	words: z.array(wordSchema).nullable(),
	transcriptError: z.string().optional(),
	analysis: z.object({ cuts: z.array(aiCutSchema), flagged: z.boolean(), at: z.string() }).optional(),
	export: z.object({ status: z.enum(["none", "rendering", "ready", "error"]), error: z.string().optional() }),
})
export type ProjectState = z.infer<typeof projectStateSchema>

// What the model must return from the AI mistakes pass (internal contract,
// validated by the service before the echo check).
export const cutListSchema = z.object({
	cuts: z.array(
		z.object({
			first_word: z.number().int(),
			last_word: z.number().int(),
			reason: aiCutSchema.shape.reason,
			text: z.string(), // exact words being cut, verbatim — used for validation
			confidence: aiCutSchema.shape.confidence,
		}),
	),
})

const videoAgentIdInputSchema = z.object({ id: z.string() })

export const videoAgentListOutputSchema = z.array(projectStateSchema.pick({ id: true, name: true, status: true, duration: true, createdAt: true }))

export const videoAgentStateInputSchema = videoAgentIdInputSchema
export const videoAgentStateOutputSchema = projectStateSchema

export const videoAgentAnalyzeInputSchema = videoAgentIdInputSchema.extend({ force: z.boolean().default(false) })
export const videoAgentAnalyzeOutputSchema = z.object({ cuts: z.array(aiCutSchema), flagged: z.boolean() })

export const videoAgentStartExportInputSchema = videoAgentIdInputSchema.extend({ cuts: z.array(spanSchema).default([]) })

export const videoAgentDeleteInputSchema = videoAgentIdInputSchema
