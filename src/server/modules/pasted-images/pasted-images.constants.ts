export const MIME_TO_EXT: Record<string, string> = {
	"image/png": "png",
	"image/jpeg": "jpg",
	"image/gif": "gif",
	"image/webp": "webp",
	"image/svg+xml": "svg",
	"image/avif": "avif",
	"image/bmp": "bmp",
}
export const EXT_TO_MIME = Object.fromEntries(Object.entries(MIME_TO_EXT).map(([mime, ext]) => [ext, mime]))

// callers may pre-pick the name (?name=) so they can hand out the URL before
// the upload finishes; shape is locked to our own naming scheme
export const IMAGE_NAME_RE = /^img-\d{8}-\d{6}-[a-z0-9]{1,16}\.[a-z0-9]{2,5}$/
