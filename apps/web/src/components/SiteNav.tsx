import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { Menu, X } from "lucide-react"
import { Dialog } from "radix-ui"
import { ThemeToggle } from "#/components/ThemeToggle"

const LINKS = [
	{ to: "/", label: "Today", exact: true },
	{ to: "/cards", label: "All cards" },
	{ to: "/cards/new", label: "New" },
	{ to: "/video-agent", label: "Video" },
	{ to: "/pi", label: "Images" },
	{ to: "/pt", label: "Texts" },
] as const

function Logo({ onClick }: { onClick?: () => void }) {
	return (
		<Link to="/" onClick={onClick} className="font-serif text-2xl tracking-tight text-foreground leading-none shrink-0">
			<span className="text-sage italic">Remind</span>ly
		</Link>
	)
}

/** Inline links from `sm` up; below that a hamburger opens a left drawer. */
export function SiteNav() {
	const [open, setOpen] = useState(false)
	const close = () => setOpen(false)

	return (
		<nav className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
			<div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4 sm:gap-6">
				<Dialog.Root open={open} onOpenChange={setOpen}>
					<Dialog.Trigger asChild>
						<button
							type="button"
							aria-label="Open menu"
							className="sm:hidden -ml-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-muted transition"
						>
							<Menu className="h-5 w-5" />
						</button>
					</Dialog.Trigger>
					<Dialog.Portal>
						<Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
						<Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[80vw] flex-col gap-6 border-r border-border bg-background p-5 shadow-xl duration-200 data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left">
							<div className="flex items-center justify-between">
								<Logo onClick={close} />
								<Dialog.Close asChild>
									<button
										type="button"
										aria-label="Close menu"
										className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition"
									>
										<X className="h-5 w-5" />
									</button>
								</Dialog.Close>
							</div>
							<Dialog.Title className="sr-only">Navigation</Dialog.Title>
							<Dialog.Description className="sr-only">Go to a page</Dialog.Description>
							<div className="flex flex-col gap-1 text-base text-muted-foreground">
								{LINKS.map((l) => (
									<Link
										key={l.to}
										to={l.to}
										onClick={close}
										activeOptions={{ exact: "exact" in l }}
										className="rounded-md px-3 py-2.5 hover:bg-muted transition"
										activeProps={{ className: "bg-muted text-foreground" }}
									>
										{l.label}
									</Link>
								))}
							</div>
						</Dialog.Content>
					</Dialog.Portal>
				</Dialog.Root>

				<Logo />
				<div className="hidden sm:flex gap-4 text-sm text-muted-foreground">
					{LINKS.map((l) => (
						<Link key={l.to} to={l.to} activeOptions={{ exact: "exact" in l }} activeProps={{ className: "text-foreground" }}>
							{l.label}
						</Link>
					))}
				</div>
				<div className="ml-auto shrink-0">
					<ThemeToggle />
				</div>
			</div>
		</nav>
	)
}
