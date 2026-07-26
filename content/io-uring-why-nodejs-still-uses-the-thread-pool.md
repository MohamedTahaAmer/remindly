# What is io_uring, and why doesn't Node.js use it for file I/O today?

io_uring (Linux 5.1, 2019) is the kernel's _completion-based_ async I/O API: two ring buffers shared between userspace and kernel — you write "read fd 12, 4096 bytes, offset 0" into the submission queue, the kernel writes the result into the completion queue when the DMA finishes. No thread ever blocks, so no thread pool is needed. Node 20.3.0 (libuv 1.45) shipped it for fs ops with ~8x microbenchmark wins — then CVE-2024-22017 (io_uring's kernel worker threads kept old credentials after `setuid()` dropped privileges) got it disabled in Feb 2024, and libuv 1.49 removed the `UV_USE_IO_URING` escape hatch entirely. Every current Node line (20/22/24 LTS, 25) does file I/O on the thread pool.

---

# The rise and fall of io_uring in Node

## Why it's the "real" fix

epoll can't express async file I/O because it's readiness-based and files are always "ready". io_uring flips the model to _completion_:

```text
Submission Queue (SQ): userspace writes "read fd 12, 4096 bytes, offset 0"
     → io_uring_enter(2)          (or zero syscalls in SQPOLL mode)
Completion Queue (CQ): kernel writes the result when the DMA finishes
     → no blocked thread, no thread pool, fewer syscalls
```

## The timeline

1. **Node 20.3.0 (June 2023, libuv 1.45):** io_uring enabled by default for `open`/`read`/`write`/`fsync`/`stat` — up to ~8x throughput on fs microbenchmarks by eliminating thread-pool hops.
2. **Feb 2024 (Node 20.11.1 / 21.6.2):** disabled by default over CVE-2024-22017 — io_uring's kernel workers didn't respect privilege drops, so a process that called `setuid()` could still do I/O with root credentials. Opt-in via `UV_USE_IO_URING=1`.
3. **libuv 1.49.0 (Sept 2024):** the SQPOLL fs path disabled at the libuv level; the env var stopped working. Re-enabling now needs the embedder to call `uv_loop_configure(loop, UV_LOOP_ENABLE_IO_URING_SQPOLL)` in C — which Node never does.
4. **Since then:** Node's tracking issue (nodejs/node #52156, "Enable io_uring by default") was closed as _not planned_; libuv 1.52 even scrubbed the option from its docs.

## What survives

libuv still uses a (non-SQPOLL, CVE-unaffected) io_uring internally on modern kernels — but only to batch `epoll_ctl` calls for sockets and pipes. Nothing on the file path.

## Why it's unlikely to return soon

The CVE was a symptom, not a one-off: io_uring has produced a steady stream of kernel CVEs, to the point that some distros and Google's production kernels restrict it wholesale. The maintainers judged an 8x microbenchmark not worth shipping that attack surface enabled by default.

## The principle

The kernel finally has true async file I/O, but Node doesn't use it: security posture beat throughput. Reason about Node fs performance as thread-pool-plus-page-cache, and treat any "Node uses io_uring" claim as version-archaeology — check the changelog, not your memory.
