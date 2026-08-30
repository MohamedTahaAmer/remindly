export async function copyToClipboard(text: string) {
	try {
		await navigator.clipboard.writeText(text)
	} catch {
		// non-secure contexts (e.g. LAN IP over http) don't expose navigator.clipboard
		const el = document.createElement("textarea")
		el.value = text
		document.body.appendChild(el)
		el.select()
		document.execCommand("copy")
		el.remove()
	}
}
