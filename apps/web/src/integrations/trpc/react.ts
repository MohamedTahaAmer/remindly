import { createTRPCContext } from "@trpc/tanstack-react-query"
import type { TRPCRouter } from "#/server/infrastructure/trpc/app.router"

export const { TRPCProvider, useTRPC } = createTRPCContext<TRPCRouter>()
