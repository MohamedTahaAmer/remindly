import { createFileRoute } from "@tanstack/react-router"
import { videoAgentController } from "#/server/modules/video-agent/video-agent.controller"

export const Route = createFileRoute("/api/video-agent/$id/video")({
	server: {
		handlers: {
			GET: ({ request, params }) => videoAgentController.video(request, params.id),
		},
	},
})
