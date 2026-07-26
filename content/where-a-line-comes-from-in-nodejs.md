# Where does a "line" actually come from when reading a text file in Node.js?

Nowhere below JavaScript — the kernel only knows "read N bytes at offset X". `fs.createReadStream` pulls 64 KB chunks (its default `highWaterMark`), one `read(2)` per _chunk_, not per line; `string_decoder` turns the bytes into UTF‑8 text while holding back multibyte characters that straddle a chunk boundary; and `readline` scans for `\n`, buffering the trailing partial line and emitting one `'line'` event per complete line. A 1,000-line, 100 KB file costs about two reads through the whole kernel stack and 1,000 events in JS.

---

# Lines are a fiction assembled in userspace

```js
const rl = readline.createInterface({ input: fs.createReadStream("file.txt") })
for await (const line of rl) {
	/* ... */
}
```

## The four steps

1. **Chunked reads.** `createReadStream` opens the fd (async, via the thread pool) and reads a chunk — default `highWaterMark` for fs streams is 64 KB. Each chunk is one `read(2)` through libuv/glibc/kernel; the expensive layers are amortized across hundreds of lines.
2. **Decoding.** The chunk arrives as a `Buffer` of raw bytes. The stream's `string_decoder` converts to UTF‑8 text — and crucially holds back the trailing bytes of a multibyte character split across a chunk boundary, prepending them to the next chunk.
3. **Splitting.** `readline` scans the decoded text for `\n`, emits a `'line'` event per complete line, and keeps the final partial line in an internal buffer until the next chunk (or EOF) completes it.
4. **Backpressure.** If your consumer is slow, the stream stops issuing reads until you catch up — the `highWaterMark` machinery keeps memory bounded no matter the file size.

## The full stack in one picture

```text
your JS callback / for-await loop          ← "line" exists only here
readline: split on \n, buffer partials
stream: 64KB chunks, backpressure, utf8 decode
node C++ bindings → libuv (thread pool) → event loop (epoll doorbell)
glibc syscall wrappers
════════ ring 3 │ ring 0 ════════
kernel: VFS → page cache → block layer → NVMe driver
disk: DMA transfer → interrupt → wake sleeper
```

## The principle

Every layer below JS deals in binary chunks; "a line" is string-processing sugar at the very top. That's the right division of labor — syscalls and disk latency get amortized over 64 KB, while the cheap `\n` scanning happens per line in userspace.
