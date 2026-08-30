import { createFileRoute } from "@tanstack/react-router"
import { videoAgentController } from "#/server/modules/video-agent/video-agent.controller"

export const Route = createFileRoute("/api/video-agent/upload")({
	server: {
		handlers: {
			POST: ({ request }) => videoAgentController.upload(request),
		},
	},
})
