import { useEffect, useState } from "react"

export type Theme = "light" | "dark" | "system"

const STORAGE_KEY = "theme"

function readStored(): Theme {
	if (typeof window === "undefined") return "system"
	const v = window.localStorage.getItem(STORAGE_KEY)
	return v === "light" || v === "dark" || v === "system" ? v : "system"
}

function applyResolved(theme: Theme) {
	if (typeof window === "undefined") return
	const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
	const resolved = theme === "system" ? (prefersDark ? "dark" : "light") : theme
	const root = document.documentElement
	root.classList.remove("light", "dark")
	root.classList.add(resolved)
	root.style.colorScheme = resolved
}

export function useTheme() {
	const [theme, setThemeState] = useState<Theme>(() => readStored())

	useEffect(() => {
		applyResolved(theme)
		window.localStorage.setItem(STORAGE_KEY, theme)
	}, [theme])

	useEffect(() => {
		if (theme !== "system") return
		const mql = window.matchMedia("(prefers-color-scheme: dark)")
		const handler = () => applyResolved("system")
		mql.addEventListener("change", handler)
		return () => mql.removeEventListener("change", handler)
	}, [theme])

	return { theme, setTheme: setThemeState }
}

// Inline script that runs before paint to avoid theme flash.
// Mirror of applyResolved() — keep in sync.
export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem('${STORAGE_KEY}');var t=(s==='light'||s==='dark'||s==='system')?s:'system';var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var r=t==='system'?(d?'dark':'light'):t;var h=document.documentElement;h.classList.remove('light','dark');h.classList.add(r);h.style.colorScheme=r;}catch(e){}})();`
