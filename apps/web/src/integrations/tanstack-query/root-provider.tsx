import type { ReactNode } from "react"
import { QueryClient } from "@tanstack/react-query"
import superjson from "superjson"
import { createTRPCClient, httpBatchStreamLink, unstable_localLink } from "@trpc/client"
import { createIsomorphicFn } from "@tanstack/react-start"
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query"

import { appRouter } from "#/server/infrastructure/trpc/app.router"
import type { TRPCRouter } from "#/server/infrastructure/trpc/app.router"
import { TRPCProvider } from "#/integrations/trpc/react"

// SSR calls the router in-process; a loopback HTTP call would have to guess
// the port the server is on (dev 3000, prod 3333) and fails when it's wrong
const getLinks = createIsomorphicFn()
	.server(() => [unstable_localLink({ router: appRouter, transformer: superjson, createContext: async () => ({}) })])
	.client(() => [httpBatchStreamLink({ transformer: superjson, url: "/api/trpc" })])

export const trpcClient = createTRPCClient<TRPCRouter>({ links: getLinks() })

export function getContext() {
	const queryClient = new QueryClient({
		defaultOptions: {
			dehydrate: { serializeData: superjson.serialize },
			hydrate: { deserializeData: superjson.deserialize },
		},
	})

	const serverHelpers = createTRPCOptionsProxy({
		client: trpcClient,
		queryClient: queryClient,
	})
	const context = {
		queryClient,
		trpc: serverHelpers,
	}

	return context
}

export default function TanstackQueryProvider({ children, context }: { children: ReactNode; context: ReturnType<typeof getContext> }) {
	const { queryClient } = context

	return (
		<TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
			{children}
		</TRPCProvider>
	)
}
