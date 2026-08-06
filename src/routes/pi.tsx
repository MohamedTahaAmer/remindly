import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"
import { Check, Maximize2, Trash2 } from "lucide-react"
import { env } from "#/env"

export const Route = createFileRoute("/pi")({
	component: PastePhotos,
	ssr: false,
})

async function copyToClipboard(text: string) {
	try {
		await navigator.clipboard.writeText(text)
	} catch {
		// non-secure contexts (e.g. LAN IP over http) don't expose navigator.clipboard
		const el = document.createElement("textarea")
		el.value = text
		document.body.appendChild(el)
		el.select()
		document.execCommand("copy")
		el.remove()
	}
}

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

function PastePhotos() {
	const [images, setImages] = useState<Array<string>>([])
	const [status, setStatus] = useState<string | null>(null)
	const [copied, setCopied] = useState<string | null>(null)
	const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
	const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

	async function refresh() {
		const res = await fetch("/api/pasted-images")
		setImages(await res.json())
	}

	function flashStatus(text: string, ms = 3000) {
		if (statusTimer.current) clearTimeout(statusTimer.current)
		setStatus(text)
		statusTimer.current = setTimeout(() => setStatus(null), ms)
	}

	useEffect(() => {
		refresh()

		// global watcher: Ctrl+V anywhere on the page uploads the clipboard image
		async function onPaste(e: ClipboardEvent) {
			const files = Array.from(e.clipboardData?.items ?? [])
				.filter((item) => item.type.startsWith("image/"))
				.map((item) => item.getAsFile())
				.filter((f): f is File => f !== null)
			if (files.length === 0) return
			e.preventDefault()

			const items = files.map((file) => ({ file, name: makeName(file.type) }))
			// clipboard first — the URL is known up front; the upload runs after
			await copyToClipboard(items.map((it) => publicUrl(`/pasted-images/${it.name}`)).join("\n"))
			flashStatus("URL copied ✓ — uploading in background…", 60000)
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
				flashStatus("Uploaded ✓")
			} catch {
				flashStatus("Upload failed — the copied URL won't resolve", 8000)
			}
		}

		document.addEventListener("paste", onPaste)
		return () => document.removeEventListener("paste", onPaste)
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
			<div className="text-sm text-muted-foreground/70 select-none">
				{status ?? "Ctrl+V anywhere on this page to upload the image from your clipboard."}
			</div>

			{images.length === 0 ? (
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
		</div>
	)
}
