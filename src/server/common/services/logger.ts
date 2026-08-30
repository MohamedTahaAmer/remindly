/**
 * Nest-style context logger: `new Logger(VideoAgentService.name)` prefixes
 * every line with its context. Console-backed — under the systemd service the
 * output lands in journald (`journalctl -u remindly`).
 */
export class Logger {
	constructor(private readonly context: string) {}

	private line(level: string, message: string): string {
		return `${new Date().toISOString()} ${level.padEnd(5)} [${this.context}] ${message}`
	}

	log(message: string) {
		console.log(this.line("LOG", message))
	}

	warn(message: string) {
		console.warn(this.line("WARN", message))
	}

	error(message: string, err?: unknown) {
		const detail = err instanceof Error ? ` — ${err.message}` : err !== undefined ? ` — ${String(err)}` : ""
		console.error(this.line("ERROR", message) + detail)
	}
}
