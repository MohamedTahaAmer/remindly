import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { useTRPC } from "#/integrations/trpc/react"

export const Route = createFileRoute("/cards/new")({
	component: NewCard,
})

const fieldClass =
	"w-full rounded-md bg-input border border-border px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sage"

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
		<form onSubmit={submit} className="space-y-5 max-w-2xl">
			<h1 className="text-3xl font-semibold tracking-tight">New card</h1>

			<Field label="Front (prompt)">
				<input value={front} onChange={(e) => setFront(e.target.value)} required className={fieldClass} />
			</Field>

			<Field label="Back (answer)">
				<textarea value={back} onChange={(e) => setBack(e.target.value)} required rows={3} className={fieldClass} />
			</Field>

			<Field label="Details (optional, markdown — shown on the lesson page)">
				<textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={8} className={`${fieldClass} font-mono text-sm`} />
			</Field>

			<div className="flex gap-2">
				<button
					type="submit"
					disabled={create.isPending}
					className="rounded-md bg-sage hover:opacity-90 disabled:opacity-50 px-4 py-2 text-white font-medium transition"
				>
					{create.isPending ? "Saving…" : "Save card"}
				</button>
				<button
					type="button"
					onClick={() => router.history.back()}
					className="rounded-md border border-border hover:bg-muted px-4 py-2 text-foreground transition"
				>
					Cancel
				</button>
			</div>
		</form>
	)
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<label className="block">
			<div className="text-sm text-muted-foreground mb-1.5">{label}</div>
			{children}
		</label>
	)
}
