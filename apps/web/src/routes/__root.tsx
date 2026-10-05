import { HeadContent, Scripts, createRootRouteWithContext, useLocation } from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { TanStackDevtools } from "@tanstack/react-devtools"

import TanStackQueryDevtools from "../integrations/tanstack-query/devtools"
import { TagSidebar } from "#/components/TagSidebar"
import { SiteNav } from "#/components/SiteNav"
import { THEME_INIT_SCRIPT } from "#/lib/theme"

import appCss from "../styles.css?url"

import type { QueryClient } from "@tanstack/react-query"
import type { TRPCRouter } from "#/server/infrastructure/trpc/app.router"
import type { TRPCOptionsProxy } from "@trpc/tanstack-react-query"

interface MyRouterContext {
	queryClient: QueryClient
	trpc: TRPCOptionsProxy<TRPCRouter>
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [{ charSet: "utf-8" }, { name: "viewport", content: "width=device-width, initial-scale=1" }, { title: "Remindly" }],
		links: [
			{ rel: "preconnect", href: "https://fonts.googleapis.com" },
			{ rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap",
			},
			{ rel: "stylesheet", href: appCss },
			{ rel: "icon", type: "image/svg+xml", href: "/logo.svg" },
		],
	}),
	shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
	// The tag sidebar only lives on the home screen.
	const pathname = useLocation({ select: (l) => l.pathname })
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
				<HeadContent />
			</head>
			<body className="min-h-screen bg-background text-foreground antialiased">
				<SiteNav />
				{pathname === "/" && <TagSidebar />}
				<main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
				<TanStackDevtools
					config={{ position: "bottom-right" }}
					plugins={[{ name: "Tanstack Router", render: <TanStackRouterDevtoolsPanel /> }, TanStackQueryDevtools]}
				/>
				<Scripts />
			</body>
		</html>
	)
}
