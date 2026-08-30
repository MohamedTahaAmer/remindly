import { createFileRoute } from "@tanstack/react-router"
import { pastedImagesController } from "#/server/modules/pasted-images/pasted-images.controller"

export const Route = createFileRoute("/pasted-images/$name")({
	server: {
		handlers: {
			GET: ({ params }) => pastedImagesController.serve(params.name),
		},
	},
})
