import { createFileRoute } from "@tanstack/react-router"
import { videoAgentController } from "#/server/modules/video-agent/video-agent.controller"

export const Route = createFileRoute("/api/video-agent/$id/state")({
	server: {
		handlers: {
			GET: ({ params }) => videoAgentController.state(params.id),
		},
	},
})
