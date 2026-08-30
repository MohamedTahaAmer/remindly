# How does Node.js fake asynchronous file I/O with the libuv thread pool?

tags: nodejs, os

Since epoll can't help with files, `fs.readFile` is _synchronous I/O outsourced_: libuv queues the request to a worker thread (pool of 4 by default, `UV_THREADPOOL_SIZE`), the worker runs a plain blocking `read(2)` through the same kernel path as sync, and on completion signals an eventfd via `uv_async_send`. That eventfd _is_ registered with epoll, so `epoll_wait` in the loop's poll phase wakes up and your JS callback runs. epoll is involved only as a completion doorbell — never for the file itself — and the real concurrency limit is thread count, not fd count.

---

# `fs.readFile`: blocking reads, hidden on worker threads

```text
main thread                          worker thread (one of 4)
───────────                          ────────────────────────
fs.readFile(cb)
 └─ uv_fs_read(loop, req, ..., cb)
     └─ uv__work_submit ──queue──►   picks up request
 (main thread returns to JS           └─ glibc read(2)  ← BLOCKS HERE
  immediately; event loop                 (same kernel path as sync:
  keeps spinning)                          page cache / disk / sleep)
                                      done → uv_async_send(loop)
                                              │
 epoll_wait() in poll phase  ◄── eventfd write wakes the loop
 └─ invokes your JS callback with the buffer
```

## The details worth knowing

- **The pool defaults to 4 threads** (`UV_THREADPOOL_SIZE`, max 1024) and is _shared_ by fs, `dns.lookup`, `crypto.pbkdf2`/`scrypt`, and zlib. Fire 8 concurrent `fs.readFile`s on a cold cache and 4 of them queue — a classic hidden bottleneck.
- **The doorbell:** the worker calls `uv_async_send`, which writes to an eventfd registered with epoll. So epoll _does_ participate in async file I/O — but only to wake the loop, never to watch the file.
- **Where your callback fires:** the event loop's phases per iteration are timers → pending callbacks → idle/prepare → **poll** (where `epoll_wait` sits, with a timeout computed from the nearest timer) → check (`setImmediate`) → close callbacks. Completed fs requests are drained in the poll phase.
- **It's the same kernel work as sync** — page cache hit or DMA-and-sleep — just on a thread whose blocking nobody minds.

## The contrast with sockets

Sockets: one thread, epoll, 100k concurrent connections — concurrency bounded by fds. Files: N threads doing blocking reads — concurrency bounded by `UV_THREADPOOL_SIZE`. Same event loop, two completely different scaling models.

## The principle

Node's "async" file I/O is an illusion built from ordinary blocking syscalls on sacrificial threads, with epoll demoted to a doorbell. When fs feels slow under concurrency, tune the thread pool — the event loop was never the bottleneck.
