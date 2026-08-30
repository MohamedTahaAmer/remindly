import { createFileRoute } from "@tanstack/react-router"
import { pastedTextsController } from "#/server/modules/pasted-texts/pasted-texts.controller"

export const Route = createFileRoute("/pasted-texts/$id")({
	server: {
		handlers: {
			GET: ({ params }) => pastedTextsController.serve(params.id),
			DELETE: ({ params }) => pastedTextsController.delete(params.id),
		},
	},
})
