import { Logger } from "#/server/common/services/logger"
import { middleware } from "../trpc.ts"

const logger = new Logger("tRPC")

/**
 * Logs every mutation and every failed call with its duration. Successful
 * queries are deliberately silent — the video-agent editor polls `state`
 * every 1.5s and would drown the journal.
 */
export const loggerMiddleware = middleware(async ({ path, type, next }) => {
	const start = Date.now()
	const result = await next()
	const ms = Date.now() - start
	if (!result.ok) logger.error(`${type} ${path} failed after ${ms}ms — ${result.error.message}`)
	else if (type === "mutation") logger.log(`${type} ${path} — ${ms}ms`)
	return result
})
