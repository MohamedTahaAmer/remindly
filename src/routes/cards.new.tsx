import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { useTRPC } from "#/integrations/trpc/react"

export const Route = createFileRoute("/cards/new")({
	component: NewCard,
})

const fieldBase =
	"w-full bg-transparent border-0 border-b border-border focus:border-sage focus:outline-none focus:ring-0 px-0 py-2 text-foreground placeholder:text-muted-foreground/60 transition-colors field-sizing-content max-h-[60vh] user-invalid:border-coral"

function NewCard() {
	const trpc = useTRPC()
	const router = useRouter()
	const [front, setFront] = useState("")
	const [back, setBack] = useState("")
	const [details, setDetails] = useState("")

	const create = useMutation({
		...trpc.cards.create.mutationOptions(),
		onSuccess: () => router.navigate({ to: "/cards" }),
	})

	function submit(e: React.FormEvent) {
		e.preventDefault()
		if (!front.trim() || !back.trim()) return
		create.mutate({ front, back, detailsMarkdown: details.trim() || null })
	}

	return (
		<form onSubmit={submit} className="max-w-2xl mx-auto space-y-10">
			<header className="border-b border-border pb-6">
				<div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-mono">A new entry</div>
				<h1 className="font-serif text-4xl tracking-tight mt-1" style={{ fontVariationSettings: '"opsz" 144' }}>
					New card<span className="text-sage italic font-normal">.</span>
				</h1>
			</header>

			<Field label="The prompt" hint="What you want to be asked. Markdown inline allowed.">
				<input
					value={front}
					onChange={(e) => setFront(e.target.value)}
					required
					autoFocus
					placeholder="Write the question…"
					className={`${fieldBase} font-serif text-2xl leading-snug`}
					style={{ fontVariationSettings: '"opsz" 144' }}
				/>
			</Field>

			<Field label="The answer" hint="The short response you want to recall.">
				<textarea
					value={back}
					onChange={(e) => setBack(e.target.value)}
					required
					rows={2}
					placeholder="Write the answer…"
					className={`${fieldBase} font-serif text-lg`}
				/>
			</Field>

			<Field label="The lesson" hint="Optional. Markdown — appears on the card's page.">
				<textarea
					value={details}
					onChange={(e) => setDetails(e.target.value)}
					rows={8}
					placeholder="# Notes&#10;&#10;Long-form context, examples, gotchas…"
					className={`${fieldBase} font-mono text-sm`}
				/>
			</Field>

			<div className="flex items-center gap-3 pt-4">
				<button
					type="submit"
					disabled={create.isPending}
					className="rounded-full bg-sage hover:bg-sage/90 disabled:opacity-50 px-6 py-2.5 text-sm text-white font-medium transition shadow-sm shadow-sage/30"
				>
					{create.isPending ? "Saving…" : "Save card →"}
				</button>
				<button
					type="button"
					onClick={() => router.history.back()}
					className="rounded-full px-5 py-2.5 text-sm text-muted-foreground hover:text-foreground transition"
				>
					Cancel
				</button>
			</div>
		</form>
	)
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
	return (
		<label className="block">
			<div className="flex items-baseline justify-between mb-2">
				<div className="text-[11px] uppercase tracking-[0.2em] font-mono text-muted-foreground">{label}</div>
				{hint && <div className="text-xs text-muted-foreground/70 italic font-serif">{hint}</div>}
			</div>
			{children}
		</label>
	)
}
