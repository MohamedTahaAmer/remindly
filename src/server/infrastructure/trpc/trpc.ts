import { initTRPC } from "@trpc/server"
import superjson from "superjson"

const t = initTRPC.create({
	transformer: superjson,
})

export const createTRPCRouter = t.router
export const middleware = t.middleware
// Base procedure without middleware — compose the app procedures in
// procedures.ts (routers import from there, not from here).
export const baseProcedure = t.procedure
