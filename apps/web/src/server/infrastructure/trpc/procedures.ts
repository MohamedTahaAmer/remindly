import { loggerMiddleware } from "./middleware/logger.middleware.ts"
import { baseProcedure } from "./trpc.ts"

export const publicProcedure = baseProcedure.use(loggerMiddleware)
