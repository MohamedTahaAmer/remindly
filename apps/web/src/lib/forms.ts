import type { KeyboardEvent } from "react"

// the prompt is one line of meaning: Enter moves on (submits when valid), Shift+Enter still breaks
export function submitOnEnter(e: KeyboardEvent<HTMLTextAreaElement>) {
	if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return
	e.preventDefault()
	e.currentTarget.form?.requestSubmit()
}

/** Hover-revealed delete buttons are deliberate with a mouse; on touch they sit
 * on every tile and are easy to hit by accident, so ask first there. */
export function confirmDelete(message: string) {
	return !window.matchMedia("(pointer: coarse)").matches || window.confirm(message)
}
