import { spawn } from "node:child_process"

/**
 * Promisified spawn that captures stdout+stderr and rejects on non-zero exit.
 * Never use execSync in the server — it would block the event loop for the
 * whole duration of an ffmpeg render.
 */
export function run(cmd: string, args: Array<string>, input?: string): Promise<{ stdout: string; stderr: string }> {
	return new Promise((resolve, reject) => {
		const child = spawn(cmd, args)
		let stdout = ""
		let stderr = ""
		child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString()))
		child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()))
		child.on("error", reject)
		child.on("close", (code) => {
			if (code === 0) resolve({ stdout, stderr })
			else reject(new Error(`${cmd} exited with ${code}: ${stderr.slice(-2000)}`))
		})
		if (input !== undefined) child.stdin.end(input)
	})
}
