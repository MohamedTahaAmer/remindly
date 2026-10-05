import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"

import { tanstackStart } from "@tanstack/react-start/plugin/vite"

import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react"
import babel from "@rolldown/plugin-babel"
import tailwindcss from "@tailwindcss/vite"

const config = defineConfig({
	// listen on all interfaces so pasted-image URLs work via the box's public IP
	server: { host: true },
	// served publicly as https://remindly.minvo.pro (Caddy on this box → :3333)
	preview: { host: true, port: 3333, strictPort: true, allowedHosts: ["remindly.minvo.pro"] },
	resolve: { tsconfigPaths: true },
	// workspace packages ship raw .ts — bundle them into the SSR build
	ssr: { noExternal: ["@remindly/db", "@remindly/config", "@remindly/ai", "@remindly/utils"] },
	plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact(), babel({ presets: [reactCompilerPreset()] })],
})

export default config
