import { Moon, Sun } from "lucide-react"
import { DropdownMenu } from "radix-ui"
import { useTheme } from "#/lib/theme"
import type { Theme } from "#/lib/theme"

const ITEMS: { value: Theme; label: string }[] = [
	{ value: "light", label: "Light" },
	{ value: "dark", label: "Dark" },
	{ value: "system", label: "System" },
]

export function ThemeToggle() {
	const { theme, setTheme } = useTheme()

	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger asChild>
				<button
					type="button"
					aria-label="Toggle theme"
					className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground hover:bg-muted transition"
				>
					<Sun className="h-[1.1rem] w-[1.1rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
					<Moon className="absolute h-[1.1rem] w-[1.1rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
					<span className="sr-only">Toggle theme</span>
				</button>
			</DropdownMenu.Trigger>
			<DropdownMenu.Portal>
				<DropdownMenu.Content
					align="end"
					sideOffset={6}
					className="z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground p-1 shadow-md"
				>
					{ITEMS.map((item) => (
						<DropdownMenu.Item
							key={item.value}
							onSelect={() => setTheme(item.value)}
							className="flex items-center justify-between px-2 py-1.5 text-sm rounded-sm cursor-pointer outline-none focus:bg-muted data-[highlighted]:bg-muted"
						>
							<span>{item.label}</span>
							{theme === item.value && <span className="text-sage">●</span>}
						</DropdownMenu.Item>
					))}
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	)
}
