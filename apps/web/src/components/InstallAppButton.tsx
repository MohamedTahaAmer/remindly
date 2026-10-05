import { useEffect, useState, useSyncExternalStore } from "react"
import { Download, EllipsisVertical, Share, SquarePlus } from "lucide-react"
import { Button } from "#/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "#/components/ui/sheet"
import { cn } from "#/lib/utils"

// Chrome's install prompt, captured when the browser decides the app is installable.
// It only ever fires in a secure context (https / localhost) with a valid manifest.
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> }

let deferred: InstallPromptEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

// registered at module load (before hydration) so an early event isn't missed
if (typeof window !== "undefined") {
	window.addEventListener("beforeinstallprompt", (e) => {
		e.preventDefault() // keep Chrome's mini-infobar away; our button shows the prompt
		deferred = e as InstallPromptEvent
		notify()
	})
	window.addEventListener("appinstalled", () => {
		deferred = null
		notify()
	})
}

function useInstallPrompt() {
	return useSyncExternalStore(
		(l) => {
			listeners.add(l)
			return () => listeners.delete(l)
		},
		() => deferred,
		() => null,
	)
}

function isStandalone() {
	return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

function isIOS() {
	return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
}

/** "Download the app": the native install prompt when the browser offers one, else how-to steps. Hidden once installed. */
export function InstallAppButton({ className, onDone }: { className?: string; onDone?: () => void }) {
	const prompt = useInstallPrompt()
	// standalone is only knowable in the browser; render nothing until mounted so SSR markup matches
	const [installed, setInstalled] = useState<boolean | null>(null)
	const [helpOpen, setHelpOpen] = useState(false)

	useEffect(() => {
		setInstalled(isStandalone())
		const mq = window.matchMedia("(display-mode: standalone)")
		const onChange = () => setInstalled(isStandalone())
		mq.addEventListener("change", onChange)
		return () => mq.removeEventListener("change", onChange)
	}, [])

	if (installed !== false) return null

	async function install() {
		if (!prompt) {
			setHelpOpen(true)
			return
		}
		await prompt.prompt()
		const { outcome } = await prompt.userChoice
		deferred = null
		notify()
		if (outcome === "accepted") onDone?.()
	}

	const ios = isIOS()

	return (
		<>
			<Button type="button" onClick={install} className={cn("bg-sage text-white hover:bg-sage/90", className)}>
				<Download /> Download the app
			</Button>

			<Sheet open={helpOpen} onOpenChange={setHelpOpen}>
				<SheetContent side="bottom" onOpenAutoFocus={(e) => e.preventDefault()} className="rounded-t-2xl px-5 pt-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:max-w-md sm:mx-auto">
					<SheetHeader className="p-0">
						<SheetTitle className="font-serif text-2xl font-normal">Add Remindly to your home screen</SheetTitle>
						<SheetDescription>It opens like an app, with its own icon.</SheetDescription>
					</SheetHeader>
					<ol className="space-y-3 text-sm">
						{ios ? (
							<>
								<Step n={1}>
									Tap <Share className="inline size-4 -mt-0.5" /> <b>Share</b> in Safari's toolbar
								</Step>
								<Step n={2}>
									Choose <SquarePlus className="inline size-4 -mt-0.5" /> <b>Add to Home Screen</b>
								</Step>
								<Step n={3}>
									Tap <b>Add</b>
								</Step>
							</>
						) : (
							<>
								<Step n={1}>
									Open the browser menu <EllipsisVertical className="inline size-4 -mt-0.5" />
								</Step>
								<Step n={2}>
									Tap <b>Install app</b> or <b>Add to Home screen</b>
								</Step>
								<Step n={3}>
									Confirm with <b>Install</b> / <b>Add</b>
								</Step>
							</>
						)}
					</ol>
					{!window.isSecureContext && (
						<p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
							This address isn't https, so the browser adds a shortcut that opens in a tab rather than a full app.
						</p>
					)}
				</SheetContent>
			</Sheet>
		</>
	)
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
	return (
		<li className="flex items-start gap-3">
			<span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-sage/15 text-xs font-medium text-sage">{n}</span>
			<span className="pt-0.5">{children}</span>
		</li>
	)
}
