import { createFileRoute } from "@tanstack/react-router"
import { pastedImagesController } from "#/server/modules/pasted-images/pasted-images.controller"

export const Route = createFileRoute("/api/pasted-images")({
	server: {
		handlers: {
			POST: ({ request }) => pastedImagesController.upload(request),
		},
	},
})
