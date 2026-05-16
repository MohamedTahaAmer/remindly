import { Marked } from "marked"
import markedShiki from "marked-shiki"
import { createHighlighter, type Highlighter } from "shiki"

const LANGUAGES = [
	"typescript",
	"tsx",
	"javascript",
	"jsx",
	"json",
	"bash",
	"shell",
	"sql",
	"python",
	"rust",
	"go",
	"html",
	"css",
	"markdown",
	"yaml",
	"diff",
] as const

let highlighterPromise: Promise<Highlighter> | null = null

function getHighlighter() {
	if (!highlighterPromise) {
		highlighterPromise = createHighlighter({
			themes: ["github-light", "github-dark"],
			langs: [...LANGUAGES],
		})
	}
	return highlighterPromise
}

const marked = new Marked().use(
	markedShiki({
		async highlight(code, lang) {
			const highlighter = await getHighlighter()
			const language = (LANGUAGES as readonly string[]).includes(lang) ? lang : "text"
			return highlighter.codeToHtml(code, {
				lang: language,
				themes: { light: "github-light", dark: "github-dark" },
				defaultColor: false,
			})
		},
	}),
)

export async function parseMarkdown(md: string): Promise<string> {
	return marked.parse(md, { async: true })
}

// Synchronous, no shiki — used for short titles where we just want
// `code` spans, **bold**, *italic*, etc. Safe to call on the client.
const inlineMarked = new Marked()
export function parseInlineMarkdown(md: string): string {
	return inlineMarked.parseInline(md, { async: false }) as string
}
