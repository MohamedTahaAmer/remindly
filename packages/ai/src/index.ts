import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { z } from "zod"

import { run } from "@remindly/utils"

// AI calls run through the installed Claude Code CLI (subscription auth), not
// an API key. The remindly systemd service PATH lacks ~/.local/bin, so the
// binary is resolved to an absolute path when possible.
const localClaudeBin = path.join(os.homedir(), ".local/bin/claude")
const CLAUDE_BIN = fs.existsSync(localClaudeBin) ? localClaudeBin : "claude"

export type AskClaudeOptions<T> = {
	system: string
	prompt: string
	/** Output contract: enforced on the call via --json-schema, then re-validated with zod. */
	schema: z.ZodType<T>
	model?: string
}

/**
 * One-shot structured call: no tools, no settings/CLAUDE.md context, prompt
 * over stdin (arg length limits), output shape enforced by --json-schema
 * derived from the given zod schema.
 */
export async function askClaude<T>({ system, prompt, schema, model = "claude-opus-5" }: AskClaudeOptions<T>): Promise<T> {
	// draft-7 without the $schema marker — the CLI's validator rejects 2020-12
	const jsonSchema = z.toJSONSchema(schema as z.ZodType, { target: "draft-7" })
	delete (jsonSchema as Record<string, unknown>).$schema

	let result
	try {
		result = await run(
			CLAUDE_BIN,
			[
				"-p",
				"--model",
				model,
				"--output-format",
				"json",
				"--tools",
				"",
				"--setting-sources",
				"",
				"--system-prompt",
				system,
				"--json-schema",
				JSON.stringify(jsonSchema),
			],
			prompt,
		)
	} catch (err) {
		const message = (err as NodeJS.ErrnoException).code === "ENOENT" ? "claude CLI not found on this machine" : (err as Error).message
		throw new Error(message)
	}
	const envelope = JSON.parse(result.stdout) as { is_error: boolean; result: string; structured_output?: unknown }
	if (envelope.is_error) throw new Error(`claude CLI failed: ${envelope.result.slice(0, 500)}`)
	const parsed = schema.safeParse(envelope.structured_output)
	if (!parsed.success) throw new Error("model returned output that doesn't match the expected schema")
	return parsed.data
}
