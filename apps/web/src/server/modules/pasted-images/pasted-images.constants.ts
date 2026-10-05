// pure data, no node imports — the /pi page imports these too
export const MIME_TO_EXT: Record<string, string> = {
	"image/png": "png",
	"image/jpeg": "jpg",
	"image/gif": "gif",
	"image/webp": "webp",
	"image/svg+xml": "svg",
	"image/avif": "avif",
	"image/bmp": "bmp",
	"video/mp4": "mp4",
	"video/webm": "webm",
	"video/quicktime": "mov",
	"video/x-matroska": "mkv",
	"video/x-m4v": "m4v",
}
export const EXT_TO_MIME = Object.fromEntries(Object.entries(MIME_TO_EXT).map(([mime, ext]) => [ext, mime]))

export function isVideoName(name: string) {
	return (EXT_TO_MIME[name.slice(name.lastIndexOf(".") + 1)] ?? "").startsWith("video/")
}

// callers may pre-pick the name (?name=) so they can hand out the URL before
// the upload finishes; shape is locked to our own naming scheme
export const IMAGE_NAME_RE = /^(img|vid)-\d{8}-\d{6}-[a-z0-9]{1,16}\.[a-z0-9]{2,5}$/
