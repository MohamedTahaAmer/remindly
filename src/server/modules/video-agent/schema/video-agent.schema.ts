import { z } from "zod"

export type Word = { text: string; start: number; end: number; confidence: number } // seconds
export type Span = { start: number; end: number } // seconds
export type AiCut = {
	firstWord: number
	lastWord: number
	reason: "repeated_word" | "repeated_sentence" | "false_start" | "retake" | "filler"
	text: string
	confidence: "high" | "medium" | "low"
	start: number
	end: number // filled in server-side from word times
}
export type ProjectState = {
	id: string
	name: string
	createdAt: string
	status: "processing" | "ready" | "error"
	step: "saving" | "probing" | "extracting-audio" | "detecting-silence" | "transcribing" | "done"
	error?: string
	duration: number
	hasAudio: boolean
	silences: Array<Span>
	words: Array<Word> | null // null => no transcript (missing key or ASR failure)
	transcriptError?: string // human-readable reason words are null
	analysis?: { cuts: Array<AiCut>; flagged: boolean; at: string }
	export: { status: "none" | "rendering" | "ready" | "error"; error?: string }
}

// What the model must return from the AI mistakes pass.
export const cutListSchema = z.object({
	cuts: z.array(
		z.object({
			first_word: z.number().int(),
			last_word: z.number().int(),
			reason: z.enum(["repeated_word", "repeated_sentence", "false_start", "retake", "filler"]),
			text: z.string(), // exact words being cut, verbatim — used for validation
			confidence: z.enum(["high", "medium", "low"]),
		}),
	),
})

export const exportInputSchema = z.object({
	cuts: z.array(z.object({ start: z.number(), end: z.number() })).default([]),
})
