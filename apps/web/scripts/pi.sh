#!/usr/bin/env bash
# pi.sh — save a clipboard image into the pasted-images folder and copy its
# public URL back to your clipboard.
#
# The clipboard is on YOUR PC, not this box, so the image must arrive on stdin.
# Alias for the PC (Wayland):
#
#   alias pi="wl-paste -t image/png | command ssh ovh pi | tee /dev/tty | wl-copy"
#
# (`command ssh` bypasses kitty's ssh-kitten alias, which rejects piped stdin;
# the remote `pi` works because this script is symlinked at /usr/local/bin/pi
# on the box.)
#
# The public URL is printed to stdout (which the alias tees and wl-copies into
# the PC clipboard) and also sent as an OSC 52 escape on stderr, which
# terminals that support it translate into "set the local clipboard" on their
# own.
#
# Run on the box itself (no piped stdin), it falls back to local clipboard
# tools, which only works with X/Wayland forwarding.
set -euo pipefail

# readlink -f resolves the /usr/local/bin/pi symlink back to this file
REPO_DIR="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")/.." && pwd)"

env_get() {
	grep -E "^$1=" "$REPO_DIR/.env.local" 2>/dev/null | tail -1 | cut -d= -f2- || true
}

PHOTOS_DIR="$(env_get PHOTOS_BASE_DIR)"
PHOTOS_DIR="${PHOTOS_DIR:-$REPO_DIR/_local/pasted-images}"
BASE_URL="$(env_get VITE_PHOTOS_PUBLIC_URL)"
BASE_URL="${BASE_URL:-http://192.99.45.15:3333}"

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

# On stdin, only the first bytes are read up front — enough to sniff the type
# and announce the URL — and the rest is drained after, so the clipboard gets
# the URL while the image is still streaming in over ssh.
stream_rest=0
if [ ! -t 0 ]; then
	head -c 512 > "$tmp"
	stream_rest=1
elif command -v wl-paste > /dev/null 2>&1 && wl-paste -t image/png > "$tmp" 2>/dev/null; then
	:
elif command -v xclip > /dev/null 2>&1 && xclip -selection clipboard -t image/png -o > "$tmp" 2>/dev/null; then
	:
else
	echo "error: no image on stdin and no local clipboard available." >&2
	echo "Pipe your PC clipboard through ssh — see the header of this script." >&2
	exit 1
fi

if [ ! -s "$tmp" ]; then
	echo "error: got 0 bytes — is there an image on the clipboard?" >&2
	exit 1
fi

mime="$(file -b --mime-type "$tmp")"
case "$mime" in
	image/png) ext=png ;;
	image/jpeg) ext=jpg ;;
	image/gif) ext=gif ;;
	image/webp) ext=webp ;;
	image/svg+xml) ext=svg ;;
	image/avif) ext=avif ;;
	image/bmp) ext=bmp ;;
	*)
		echo "error: clipboard data is $mime, not an image." >&2
		exit 1
		;;
esac

rand="$(od -An -N3 -tx1 /dev/urandom | tr -d ' \n')"
name="img-$(date +%Y%m%d-%H%M%S)-$rand.$ext"
url="${BASE_URL%/}/pasted-images/$name"

# Announce the URL before the transfer finishes. OSC 52 (stderr) asks the
# terminal on the PC to set its clipboard the moment the escape arrives;
# stdout stays clean for piping (e.g. `| wl-copy`).
b64="$(printf %s "$url" | base64 | tr -d '\n')"
if [ -n "${TMUX:-}" ]; then
	printf '\033Ptmux;\033\033]52;c;%s\a\033\\' "$b64" >&2
else
	printf '\033]52;c;%s\a' "$b64" >&2
fi
echo "$url"

if [ "$stream_rest" = 1 ]; then
	cat >> "$tmp"
fi

mkdir -p "$PHOTOS_DIR"
cp "$tmp" "$PHOTOS_DIR/$name"
chmod 644 "$PHOTOS_DIR/$name"
