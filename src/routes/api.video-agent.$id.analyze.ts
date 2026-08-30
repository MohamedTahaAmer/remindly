import { createFileRoute } from "@tanstack/react-router"
import { videoAgentController } from "#/server/modules/video-agent/video-agent.controller"

export const Route = createFileRoute("/api/video-agent/$id/analyze")({
	server: {
		handlers: {
			POST: ({ request, params }) => videoAgentController.analyze(request, params.id),
		},
	},
})
