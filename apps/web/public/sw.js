// Remindly service worker — makes the app installable and keeps a last-known
// copy of pages for when the network drops. Pages are network-first so a
// deploy shows up on the next load; only hashed /assets/* are cache-first.
const CACHE = "remindly-v1"

self.addEventListener("install", () => self.skipWaiting())

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
			.then(() => self.clients.claim()),
	)
})

self.addEventListener("fetch", (event) => {
	const req = event.request
	if (req.method !== "GET") return
	const url = new URL(req.url)
	// data, uploads and media are never cached here (media needs Range requests)
	if (url.origin !== location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/pasted-")) return

	if (url.pathname.startsWith("/assets/")) {
		event.respondWith(
			caches.match(req).then(
				(hit) =>
					hit ??
					fetch(req).then((res) => {
						if (res.ok) {
							const copy = res.clone()
							caches.open(CACHE).then((c) => c.put(req, copy))
						}
						return res
					}),
			),
		)
		return
	}

	if (req.mode === "navigate") {
		event.respondWith(
			fetch(req)
				.then((res) => {
					if (res.ok) {
						const copy = res.clone()
						caches.open(CACHE).then((c) => c.put(req, copy))
					}
					return res
				})
				.catch(() => caches.match(req).then((hit) => hit ?? caches.match("/")).then((hit) => hit ?? Response.error())),
		)
	}
})
