import { createFileRoute } from "@tanstack/react-router"
import { pastedTextsController } from "#/server/modules/pasted-texts/pasted-texts.controller"

export const Route = createFileRoute("/api/pasted-texts")({
	server: {
		handlers: {
			GET: () => pastedTextsController.list(),
			POST: ({ request }) => pastedTextsController.create(request),
		},
	},
})
