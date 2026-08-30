import { useEffect, useRef, useState } from "react"
import { useNavigate, useSearch } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ChevronsLeft, Tag, X } from "lucide-react"
import { Tooltip } from "radix-ui"
import { useTRPC } from "#/integrations/trpc/react"

const COLLAPSED_KEY = "tag-sidebar-collapsed"

// Tag name that shows the full text in a tooltip, but only when it's actually truncated.
function TagName({ name }: { name: string }) {
	const ref = useRef<HTMLSpanElement>(null)
	const [open, setOpen] = useState(false)

	return (
		<Tooltip.Provider delayDuration={300}>
			<Tooltip.Root
				open={open}
				onOpenChange={(next) => {
					const el = ref.current
					setOpen(next && !!el && el.scrollWidth > el.clientWidth)
				}}
			>
				<Tooltip.Trigger asChild>
					<span ref={ref} className="truncate">
						{name}
					</span>
				</Tooltip.Trigger>
				<Tooltip.Portal>
					<Tooltip.Content
						side="top"
						sideOffset={6}
						className="z-50 max-w-60 rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground shadow-md [overflow-wrap:anywhere]"
					>
						{name}
						<Tooltip.Arrow className="fill-card" />
					</Tooltip.Content>
				</Tooltip.Portal>
			</Tooltip.Root>
		</Tooltip.Provider>
	)
}

export type TagSearch = { tags?: number[]; match?: "all" }

// Shared validateSearch for routes that support tag filtering (?tags=[1,2]&match=all).
export function validateTagSearch(search: Record<string, unknown>): TagSearch {
	const raw = search.tags
	const arr = Array.isArray(raw) ? raw.map(Number).filter(Number.isFinite) : undefined
	return { tags: arr?.length ? arr : undefined, match: search.match === "all" ? "all" : undefined }
}

export function TagSidebar() {
	const trpc = useTRPC()
	const queryClient = useQueryClient()
	const navigate = useNavigate()
	const { data: allTags } = useQuery(trpc.tags.list.queryOptions())
	const search: TagSearch = useSearch({ strict: false })
	const selected = search.tags ?? []
	const match = search.match ?? "any"
	const [newTag, setNewTag] = useState("")

	// Collapsed state persists per browser; read after mount so SSR markup stays stable.
	const [collapsed, setCollapsed] = useState(false)
	useEffect(() => {
		try {
			setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "1")
		} catch {
			/* storage unavailable — stay expanded */
		}
	}, [])
	const setCollapsedPersisted = (next: boolean) => {
		setCollapsed(next)
		try {
			localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0")
		} catch {
			/* fine without persistence */
		}
	}

	const invalidate = () => {
		void queryClient.invalidateQueries()
	}
	const createTag = useMutation(trpc.tags.create.mutationOptions({ onSuccess: invalidate }))
	const deleteTag = useMutation(trpc.tags.delete.mutationOptions({ onSuccess: invalidate }))

	const setSelection = (tagIds: number[], m: "any" | "all" = match) => {
		void navigate({
			to: ".",
			search: (prev: Record<string, unknown>) => ({
				...prev,
				tags: tagIds.length ? tagIds : undefined,
				match: tagIds.length > 1 && m === "all" ? ("all" as const) : undefined,
			}),
			replace: true,
		})
	}

	const toggle = (id: number) => {
		setSelection(selected.includes(id) ? selected.filter((t) => t !== id) : [...selected, id])
	}

	const onDelete = (id: number, name: string) => {
		if (!window.confirm(`Delete tag "${name}"? Cards keep their other tags; none are deleted.`)) return
		if (selected.includes(id)) setSelection(selected.filter((t) => t !== id))
		deleteTag.mutate({ id })
	}

	const onCreate = (e: React.FormEvent) => {
		e.preventDefault()
		const name = newTag.trim()
		if (!name) return
		createTag.mutate({ name }, { onSuccess: () => setNewTag("") })
	}

	if (collapsed) {
		return (
			<button
				onClick={() => setCollapsedPersisted(false)}
				title="Show tags"
				className="hidden md:flex fixed left-3 top-20 z-20 items-center justify-center rounded-full border border-border bg-card p-2.5 shadow-sm hover:bg-muted transition"
			>
				<Tag className="size-4 text-muted-foreground" />
				{selected.length > 0 && (
					<span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-sage text-[10px] font-medium text-white">
						{selected.length}
					</span>
				)}
			</button>
		)
	}

	return (
		<aside className="hidden md:block fixed left-3 top-20 z-20 w-52 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl border border-border bg-card p-4 shadow-sm">
			<div className="space-y-4">
				<div className="flex items-center justify-between gap-2">
					<h2 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-mono">Tags</h2>
					<div className="flex items-center gap-2">
						{selected.length > 0 && (
							<button onClick={() => setSelection([])} className="text-xs text-muted-foreground hover:text-foreground transition">
								clear
							</button>
						)}
						<button
							onClick={() => setCollapsedPersisted(true)}
							title="Hide tags"
							className="text-muted-foreground hover:text-foreground transition"
						>
							<ChevronsLeft className="size-4" />
						</button>
					</div>
				</div>

				{selected.length > 1 && (
					<div className="flex rounded-md border border-border text-xs overflow-hidden">
						{(["any", "all"] as const).map((m) => (
							<button
								key={m}
								onClick={() => setSelection(selected, m)}
								className={`flex-1 px-2 py-1 capitalize transition ${match === m ? "bg-sage text-white" : "bg-card text-muted-foreground hover:bg-muted"}`}
							>
								{m}
							</button>
						))}
					</div>
				)}

				<ul className="space-y-1">
					{allTags?.map((tag) => {
						const active = selected.includes(tag.id)
						return (
							<li key={tag.id} className="group flex items-center gap-1">
								<button
									onClick={() => toggle(tag.id)}
									className={`flex-1 min-w-0 flex items-center justify-between gap-2 rounded-md px-2 py-1 text-sm text-left transition ${
										active ? "bg-sage/15 text-sage" : "text-muted-foreground hover:bg-muted hover:text-foreground"
									}`}
								>
									<TagName name={tag.name} />
									<span className="text-xs opacity-60">{tag.cardCount}</span>
								</button>
								<button
									onClick={() => onDelete(tag.id, tag.name)}
									title={`Delete tag "${tag.name}"`}
									className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-coral transition p-0.5"
								>
									<X className="size-3.5" />
								</button>
							</li>
						)
					})}
					{allTags && allTags.length === 0 && <li className="text-xs text-muted-foreground px-2">No tags yet.</li>}
				</ul>

				<form onSubmit={onCreate} className="flex gap-1">
					<input
						value={newTag}
						onChange={(e) => setNewTag(e.target.value)}
						placeholder="new tag…"
						className="w-full min-w-0 rounded-md border border-border bg-card px-2 py-1 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-sage"
					/>
					<button
						type="submit"
						disabled={!newTag.trim() || createTag.isPending}
						className="rounded-md border border-border px-2 text-sm text-muted-foreground hover:bg-muted disabled:opacity-40 transition"
					>
						+
					</button>
				</form>
				{createTag.isError && <p className="text-xs text-coral">{createTag.error.message}</p>}
			</div>
		</aside>
	)
}
