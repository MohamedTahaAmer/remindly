import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"
import { Check, Copy, Trash2 } from "lucide-react"
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

type Pending = { file: File; preview: string }

function PastePhotos() {
	const [images, setImages] = useState<Array<string>>([])
	const [pending, setPending] = useState<Array<Pending>>([])
	const [uploading, setUploading] = useState(false)
	const [copied, setCopied] = useState<string | null>(null)
	const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
	const pendingRef = useRef(pending)
	pendingRef.current = pending

	async function refresh() {
		const res = await fetch("/api/pasted-images")
		setImages(await res.json())
	}

	useEffect(() => {
		refresh()
		return () => pendingRef.current.forEach((p) => URL.revokeObjectURL(p.preview))
	}, [])

	function flashCopied(label: string) {
		if (copiedTimer.current) clearTimeout(copiedTimer.current)
		setCopied(label)
		copiedTimer.current = setTimeout(() => setCopied(null), 1500)
	}

	function onPaste(e: React.ClipboardEvent) {
		const files = Array.from(e.clipboardData.items)
			.filter((item) => item.type.startsWith("image/"))
			.map((item) => item.getAsFile())
			.filter((f): f is File => f !== null)
		if (files.length === 0) return
		e.preventDefault()
		setPending((prev) => [...prev, ...files.map((file) => ({ file, preview: URL.createObjectURL(file) }))])
	}

	async function upload() {
		if (pending.length === 0 || uploading) return
		setUploading(true)
		try {
			const urls: Array<string> = []
			for (const p of pending) {
				const res = await fetch("/api/pasted-images", {
					method: "POST",
					headers: { "content-type": p.file.type },
					body: p.file,
				})
				if (!res.ok) throw new Error(`upload failed: ${res.status}`)
				const { url } = (await res.json()) as { url: string }
				urls.push(publicUrl(url))
			}
			await copyToClipboard(urls.join("\n"))
			flashCopied("input")
			pending.forEach((p) => URL.revokeObjectURL(p.preview))
			setPending([])
			await refresh()
		} finally {
			setUploading(false)
		}
	}

	function onKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault()
			upload()
		}
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
		<div className="space-y-10">
			<div
				tabIndex={0}
				onPaste={onPaste}
				onKeyDown={onKeyDown}
				className="rounded-full border border-border bg-background shadow-sm focus:outline-none focus:ring-2 focus:ring-sage/40 focus:border-sage transition cursor-text px-4 py-2 flex items-center gap-2"
			>
				{pending.map((p, i) => (
					<div key={p.preview} className="relative group shrink-0">
						<img src={p.preview} alt="" className="h-7 w-7 object-cover rounded border border-border" />
						<button
							type="button"
							onClick={() => {
								URL.revokeObjectURL(p.preview)
								setPending((prev) => prev.filter((_, j) => j !== i))
							}}
							className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-foreground text-background text-[10px] leading-none opacity-0 group-hover:opacity-100 transition"
							aria-label="Remove image"
						>
							×
						</button>
					</div>
				))}
				<div className="text-sm text-muted-foreground/70 select-none truncate">
					{uploading
						? "Uploading…"
						: copied === "input"
							? "Uploaded — URL copied to clipboard ✓"
							: pending.length > 0
								? "Press Enter to upload"
								: "Click here, then Ctrl+V to paste an image from your clipboard…"}
				</div>
			</div>

			<section>
				<div className="text-[11px] uppercase tracking-[0.2em] font-mono text-muted-foreground mb-4">Previously pasted</div>
				{images.length === 0 ? (
					<p className="text-sm text-muted-foreground/70 italic font-serif">Nothing here yet.</p>
				) : (
					<div className="grid grid-cols-8 gap-3">
						{images.map((name) => (
							<div key={name} className="relative group">
								<a href={`/pasted-images/${name}`} target="_blank" rel="noreferrer" className="block">
									<img
										src={`/pasted-images/${name}`}
										alt={name}
										loading="lazy"
										className="aspect-square w-full object-cover rounded-lg border border-border"
									/>
								</a>
								<button
									type="button"
									onClick={() => copyImageUrl(name)}
									aria-label="Copy URL"
									className={`absolute top-1 right-1 rounded-md bg-black/60 text-white p-1.5 transition hover:bg-black/80 ${
										copied === name ? "opacity-100" : "opacity-0 group-hover:opacity-100"
									}`}
								>
									{copied === name ? <Check className="h-7 w-7" /> : <Copy className="h-7 w-7" />}
								</button>
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
			</section>
		</div>
	)
}
