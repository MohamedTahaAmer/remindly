import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"
import { Check, Eye, EyeOff, Maximize2, Trash2 } from "lucide-react"
import { env } from "#/env"
import { copyToClipboard } from "#/lib/clipboard"

export const Route = createFileRoute("/pi")({
	component: PastePhotos,
	ssr: false,
})

function publicUrl(path: string) {
	const base = env.VITE_PHOTOS_PUBLIC_URL ?? window.location.origin
	return `${base.replace(/\/$/, "")}${path}`
}

const EXT_BY_MIME: Record<string, string> = {
	"image/png": "png",
	"image/jpeg": "jpg",
	"image/gif": "gif",
	"image/webp": "webp",
	"image/svg+xml": "svg",
	"image/avif": "avif",
	"image/bmp": "bmp",
}

// name is generated client-side so the URL can be copied before the upload runs
function makeName(type: string) {
	const d = new Date()
	const pad = (n: number) => String(n).padStart(2, "0")
	const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
	return `img-${stamp}-${Math.random().toString(36).slice(2, 8)}.${EXT_BY_MIME[type] ?? "png"}`
}

const SHOW_IMAGES_KEY = "pi:show-images"

type Toast = { text: string; kind: "success" | "error" }

function PastePhotos() {
	const [images, setImages] = useState<Array<string>>([])
	const [showImages, setShowImages] = useState<boolean>(() => {
		try {
			return localStorage.getItem(SHOW_IMAGES_KEY) === "1"
		} catch {
			return false
		}
	})
	const [toast, setToast] = useState<Toast | null>(null)
	const [copied, setCopied] = useState<string | null>(null)
	const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
	const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

	async function refresh() {
		const res = await fetch("/api/pasted-images")
		setImages(await res.json())
	}

	function flashToast(text: string, kind: Toast["kind"], ms = 3000) {
		if (toastTimer.current) clearTimeout(toastTimer.current)
		setToast({ text, kind })
		toastTimer.current = setTimeout(() => setToast(null), ms)
	}

	function toggleShowImages() {
		setShowImages((prev) => {
			const next = !prev
			try {
				localStorage.setItem(SHOW_IMAGES_KEY, next ? "1" : "0")
			} catch {
				// localStorage unavailable — the toggle still works for this visit
			}
			return next
		})
	}

	useEffect(() => {
		refresh()

		async function uploadFiles(files: Array<File>) {
			const items = files.map((file) => ({ file, name: makeName(file.type) }))
			// clipboard first — the URL is known up front; the upload runs after
			await copyToClipboard(items.map((it) => publicUrl(`/pasted-images/${it.name}`)).join("\n"))
			flashToast("URL copied to clipboard ✓ — uploading…", "success", 60000)
			try {
				await Promise.all(
					items.map(async (it) => {
						const res = await fetch(`/api/pasted-images?name=${it.name}`, {
							method: "POST",
							headers: { "content-type": it.file.type },
							body: it.file,
						})
						if (!res.ok) throw new Error(`upload failed: ${res.status}`)
					}),
				)
				await refresh()
				flashToast("Uploaded ✓", "success")
			} catch {
				flashToast("Upload failed — the copied URL won't resolve", "error", 8000)
			}
		}

		let lastPasteAt = 0

		// global watcher: Ctrl+V anywhere on the page uploads the clipboard image
		function onPaste(e: ClipboardEvent) {
			lastPasteAt = Date.now()
			const files = Array.from(e.clipboardData?.items ?? [])
				.filter((item) => item.type.startsWith("image/"))
				.map((item) => item.getAsFile())
				.filter((f): f is File => f !== null)
			if (files.length === 0) return
			e.preventDefault()
			uploadFiles(files)
		}

		// fallback keyed on the physical V key (e.code), so Ctrl+V works on any
		// keyboard layout (e.g. Arabic, where the key produces "ر") even if the
		// browser doesn't map that combo to a native paste
		function onKeyDown(e: KeyboardEvent) {
			if (!(e.ctrlKey || e.metaKey) || e.code !== "KeyV") return
			const pressedAt = Date.now()
			setTimeout(async () => {
				if (lastPasteAt >= pressedAt) return // the native paste event already handled it
				if (!navigator.clipboard?.read) return // needs a secure context; nothing more we can do
				try {
					const clipItems = await navigator.clipboard.read()
					const files: Array<File> = []
					for (const item of clipItems) {
						const type = item.types.find((t) => t.startsWith("image/"))
						if (!type) continue
						const blob = await item.getType(type)
						files.push(new File([blob], "clipboard", { type }))
					}
					if (files.length > 0) uploadFiles(files)
				} catch {
					// clipboard read denied — the native paste path is the only option
				}
			}, 250)
		}

		document.addEventListener("paste", onPaste)
		document.addEventListener("keydown", onKeyDown)
		return () => {
			document.removeEventListener("paste", onPaste)
			document.removeEventListener("keydown", onKeyDown)
		}
	}, [])

	function flashCopied(name: string) {
		if (copiedTimer.current) clearTimeout(copiedTimer.current)
		setCopied(name)
		copiedTimer.current = setTimeout(() => setCopied(null), 1500)
	}

	async function copyImageUrl(name: string) {
		await copyToClipboard(publicUrl(`/pasted-images/${name}`))
		flashCopied(name)
	}

	async function deleteImage(name: string) {
		const res = await fetch(`/pasted-images/${name}`, { method: "DELETE" })
		if (res.ok) setImages((prev) => prev.filter((n) => n !== name))
	}

	return (
		<div className="space-y-8">
			<div className="flex items-center justify-end">
				<button
					type="button"
					onClick={toggleShowImages}
					className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-accent hover:text-accent-foreground cursor-pointer"
				>
					{showImages ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
					{showImages ? "Hide images" : `Show images${images.length > 0 ? ` (${images.length})` : ""}`}
				</button>
			</div>

			{!showImages ? (
				<p className="text-sm text-muted-foreground/70 italic font-serif text-center">
					{images.length === 0 ? "Nothing here yet." : `${images.length} image${images.length === 1 ? "" : "s"} hidden.`}
				</p>
			) : images.length === 0 ? (
				<p className="text-sm text-muted-foreground/70 italic font-serif">Nothing here yet.</p>
			) : (
				<div className="grid grid-cols-8 gap-3">
					{images.map((name) => (
						<div key={name} className="relative group">
							<button
								type="button"
								onClick={() => copyImageUrl(name)}
								aria-label="Copy URL"
								className="block w-full cursor-pointer"
							>
								<img
									src={`/pasted-images/${name}`}
									alt={name}
									loading="lazy"
									className="aspect-square w-full object-cover rounded-lg border border-border"
								/>
							</button>
							{copied === name && (
								<div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 pointer-events-none">
									<Check className="h-10 w-10 text-white" />
								</div>
							)}
							<a
								href={`/pasted-images/${name}`}
								target="_blank"
								rel="noreferrer"
								aria-label="Open image in new tab"
								className="absolute top-1 right-1 rounded-md bg-black/60 text-white p-1.5 transition hover:bg-black/80 opacity-0 group-hover:opacity-100"
							>
								<Maximize2 className="h-7 w-7" />
							</a>
							<button
								type="button"
								onClick={() => deleteImage(name)}
								aria-label="Delete image"
								className="absolute top-1 left-1 rounded-md bg-black/60 text-white p-1.5 transition hover:bg-red-600/90 opacity-0 group-hover:opacity-100"
							>
								<Trash2 className="h-7 w-7" />
							</button>
						</div>
					))}
				</div>
			)}

			<div className="text-xs text-muted-foreground/60 select-none text-center">
				Ctrl+V anywhere on this page to upload the image from your clipboard.
			</div>

			{toast && (
				<div
					className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg pointer-events-none ${
						toast.kind === "success" ? "bg-emerald-600" : "bg-red-600"
					}`}
				>
					{toast.text}
				</div>
			)}
		</div>
	)
}
