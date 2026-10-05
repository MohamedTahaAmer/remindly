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
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
			{ title: "Remindly" },
			{ name: "description", content: "Spaced-repetition flashcards for your own lessons." },
			// installed-app status bar / task switcher color (HeadContent dedupes by name, so one value)
			{ name: "theme-color", content: "#f7ede2" },
			{ name: "mobile-web-app-capable", content: "yes" },
			{ name: "apple-mobile-web-app-capable", content: "yes" },
			{ name: "apple-mobile-web-app-title", content: "Remindly" },
			{ name: "apple-mobile-web-app-status-bar-style", content: "default" },
		],
		links: [
			{ rel: "preconnect", href: "https://fonts.googleapis.com" },
			{ rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap",
			},
			{ rel: "stylesheet", href: appCss },
			{ rel: "icon", type: "image/svg+xml", href: "/logo.svg" },
			{ rel: "manifest", href: "/manifest.json" },
			{ rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
		],
	}),
	shellComponent: RootDocument,
})

// service workers only run in a secure context (https or localhost); on a plain
// http origin this is a no-op and the app still works, just not installable
const SW_REGISTER_SCRIPT = `if ("serviceWorker" in navigator && window.isSecureContext) window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js"))`

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
				<main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-10">{children}</main>
				<TanStackDevtools
					config={{ position: "bottom-right" }}
					plugins={[{ name: "Tanstack Router", render: <TanStackRouterDevtoolsPanel /> }, TanStackQueryDevtools]}
				/>
				<Scripts />
				<script dangerouslySetInnerHTML={{ __html: SW_REGISTER_SCRIPT }} />
			</body>
		</html>
	)
}
