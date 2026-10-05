import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { Menu } from "lucide-react"
import { Button } from "#/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "#/components/ui/sheet"
import { InstallAppButton } from "#/components/InstallAppButton"
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
		<nav className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-30 pt-[env(safe-area-inset-top)]">
			<div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4 sm:gap-6">
				<Sheet open={open} onOpenChange={setOpen}>
					<SheetTrigger asChild>
						<Button variant="ghost" size="icon" aria-label="Open menu" className="sm:hidden -ml-2 [&_svg:not([class*='size-'])]:size-5">
							<Menu />
						</Button>
					</SheetTrigger>
					<SheetContent
						side="left"
						// no focus ring on the close button the moment a tap opens it
						onOpenAutoFocus={(e) => e.preventDefault()}
						className="w-72 max-w-[80vw] gap-6 p-5 duration-200 data-[state=open]:duration-200 data-[state=closed]:duration-200">
						<SheetHeader className="p-0">
							<SheetTitle className="font-normal">
								<Logo onClick={close} />
							</SheetTitle>
							<SheetDescription className="sr-only">Go to a page</SheetDescription>
						</SheetHeader>
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
						<div className="mt-auto pb-[env(safe-area-inset-bottom)]">
							<InstallAppButton className="w-full h-11" onDone={close} />
						</div>
					</SheetContent>
				</Sheet>

				<Logo />
				<div className="hidden sm:flex gap-4 text-sm text-muted-foreground">
					{LINKS.map((l) => (
						<Link key={l.to} to={l.to} activeOptions={{ exact: "exact" in l }} activeProps={{ className: "text-foreground" }}>
							{l.label}
						</Link>
					))}
				</div>
				<div className="ml-auto shrink-0 flex items-center gap-2">
					<InstallAppButton className="max-lg:hidden" />
					<ThemeToggle />
				</div>
			</div>
		</nav>
	)
}
