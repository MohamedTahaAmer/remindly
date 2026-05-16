import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useTRPC } from "#/integrations/trpc/react"

export const Route = createFileRoute("/cards/$id/edit")({
	component: EditCard,
	loader: async ({ context, params }) => {
		await context.queryClient.prefetchQuery(
			context.trpc.cards.get.queryOptions({ id: Number(params.id) }),
		)
	},
})

const fieldClass =
	"w-full rounded-md bg-input border border-border px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sage"

function EditCard() {
	const { id } = Route.useParams()
	const numId = Number(id)
	const trpc = useTRPC()
	const router = useRouter()
	const { data: card } = useQuery(trpc.cards.get.queryOptions({ id: numId }))

	const [front, setFront] = useState("")
	const [back, setBack] = useState("")
	const [details, setDetails] = useState("")

	useEffect(() => {
		if (!card) return
		setFront(card.front)
		setBack(card.back)
		setDetails(card.detailsMarkdown ?? "")
	}, [card])

	const update = useMutation({
		...trpc.cards.update.mutationOptions(),
		onSuccess: () => router.navigate({ to: "/cards" }),
	})

	const del = useMutation({
		...trpc.cards.delete.mutationOptions(),
		onSuccess: () => router.navigate({ to: "/cards" }),
	})

	if (!card) return <div className="text-muted-foreground">Loading…</div>

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault()
				update.mutate({ id: numId, front, back, detailsMarkdown: details.trim() || null })
			}}
			className="space-y-5 max-w-2xl"
		>
			<h1 className="text-3xl font-semibold tracking-tight">Edit card</h1>

			<label className="block">
				<div className="text-sm text-muted-foreground mb-1.5">Front</div>
				<input value={front} onChange={(e) => setFront(e.target.value)} required className={fieldClass} />
			</label>

			<label className="block">
				<div className="text-sm text-muted-foreground mb-1.5">Back</div>
				<textarea value={back} onChange={(e) => setBack(e.target.value)} required rows={3} className={fieldClass} />
			</label>

			<label className="block">
				<div className="text-sm text-muted-foreground mb-1.5">Details (markdown)</div>
				<textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={8} className={`${fieldClass} font-mono text-sm`} />
			</label>

			<div className="flex justify-between">
				<div className="flex gap-2">
					<button
						type="submit"
						disabled={update.isPending}
						className="rounded-md bg-sage hover:opacity-90 disabled:opacity-50 px-4 py-2 text-white font-medium transition"
					>
						{update.isPending ? "Saving…" : "Save"}
					</button>
					<button
						type="button"
						onClick={() => router.history.back()}
						className="rounded-md border border-border hover:bg-muted px-4 py-2 text-foreground transition"
					>
						Cancel
					</button>
				</div>

				<button
					type="button"
					onClick={() => {
						if (confirm("Delete this card?")) del.mutate({ id: numId })
					}}
					className="rounded-md border border-coral text-coral hover:bg-coral/10 px-4 py-2 transition"
				>
					Delete
				</button>
			</div>
		</form>
	)
}
