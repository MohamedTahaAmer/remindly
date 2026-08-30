import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { cloudflare } from "@cloudflare/vite-plugin"
import { pastedImages } from "./scripts/vite-plugin-pasted-images"
import { pastedTexts } from "./scripts/vite-plugin-pasted-texts"
import { videoAgent } from "./scripts/vite-plugin-video-agent"

import { tanstackStart } from "@tanstack/react-start/plugin/vite"

import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react"
import babel from "@rolldown/plugin-babel"
import tailwindcss from "@tailwindcss/vite"

const config = defineConfig({
	// listen on all interfaces so pasted-image URLs work via the box's public IP
	server: { host: true },
	preview: { host: true, port: 3333, strictPort: true },
	resolve: { tsconfigPaths: true },
	plugins: [
		pastedImages(),
		pastedTexts(),
		videoAgent(),
		devtools(),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
		babel({ presets: [reactCompilerPreset()] }),
		cloudflare({ viteEnvironment: { name: "ssr" } }),
	],
})

export default config
