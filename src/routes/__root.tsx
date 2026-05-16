import { HeadContent, Link, Scripts, createRootRouteWithContext } from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { TanStackDevtools } from "@tanstack/react-devtools"

import TanStackQueryDevtools from "../integrations/tanstack-query/devtools"
import { ThemeToggle } from "#/components/ThemeToggle"
import { THEME_INIT_SCRIPT } from "#/lib/theme"

import appCss from "../styles.css?url"

import type { QueryClient } from "@tanstack/react-query"
import type { TRPCRouter } from "#/integrations/trpc/router"
import type { TRPCOptionsProxy } from "@trpc/tanstack-react-query"

interface MyRouterContext {
	queryClient: QueryClient
	trpc: TRPCOptionsProxy<TRPCRouter>
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "Remindly" },
		],
		links: [{ rel: "stylesheet", href: appCss }],
	}),
	shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
				<HeadContent />
			</head>
			<body className="min-h-screen bg-background text-foreground antialiased">
				<nav className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
					<div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-6">
						<Link to="/" className="font-semibold text-lg text-foreground">
							<span className="text-sage">Remind</span>ly
						</Link>
						<div className="flex gap-4 text-sm text-muted-foreground">
							<Link to="/" activeProps={{ className: "text-foreground" }} activeOptions={{ exact: true }}>
								Today
							</Link>
							<Link to="/cards" activeProps={{ className: "text-foreground" }}>
								All cards
							</Link>
							<Link to="/cards/new" activeProps={{ className: "text-foreground" }}>
								New
							</Link>
						</div>
						<div className="ml-auto">
							<ThemeToggle />
						</div>
					</div>
				</nav>
				<main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
				<TanStackDevtools
					config={{ position: "bottom-right" }}
					plugins={[
						{ name: "Tanstack Router", render: <TanStackRouterDevtoolsPanel /> },
						TanStackQueryDevtools,
					]}
				/>
				<Scripts />
			</body>
		</html>
	)
}
