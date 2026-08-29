# What actually happens, layer by layer, when Node.js reads a file synchronously?

`fs.readFileSync` goes V8 → Node's C++ binding (`node_file.cc`) → libuv with a NULL callback (so it runs _inline_ — no event loop, no thread pool, no epoll) → glibc's `open()`/`read()` wrappers, which just load the syscall arguments and execute the `syscall` instruction → kernel VFS → page cache. On a cache hit it's a `copy_to_user` memcpy and returns in microseconds; on a miss the block layer DMAs from disk while your _entire main thread sleeps_ — V8, the event loop, everything — until the completion interrupt wakes it. That total blockage is why sync fs is poison in a server.

---

# The sync read path: every layer between `readFileSync` and the disk

There is no "read a line" operation anywhere below JavaScript — the kernel only knows "read N bytes at offset X". The sync path is the simplest way to see the full stack:

```text
JS: fs.readFileSync()
 └─ V8 → Node C++ binding (node_file.cc)
     └─ libuv: uv_fs_open / uv_fs_read (callback = NULL → run inline)
         └─ glibc wrapper: openat(2), read(2)   ← ~a dozen instructions, executes `syscall`
             └─ KERNEL (mode switch, ring 3 → ring 0)
                 ├─ syscall table → sys_read → VFS → file->f_op->read_iter
                 ├─ page cache lookup:
                 │    HIT  → copy_to_user() → return   (microseconds, no disk)
                 │    MISS → readahead → block layer → NVMe driver
                 │           → DMA into page cache, thread SLEEPS
                 │           → hardware interrupt → thread woken
                 └─ return byte count to userspace
```

## The key points per layer

- **libuv with a NULL callback runs the operation inline** on the calling thread. None of the async machinery (loop, thread pool, epoll) is involved at all.
- **glibc's role is tiny.** `read()` is a thin wrapper that puts arguments in registers and executes the `syscall` CPU instruction. Node does _not_ use glibc's stdio layer — no `fopen`/`fgets`, no userspace stdio buffering; it calls raw syscalls. (glibc still matters elsewhere: libuv's thread pool is built on its pthreads, and malloc backs the buffers.)
- **The page cache is the great equalizer.** The kernel keeps file contents cached in RAM; a hit means the "disk read" never touches the disk — it's a kernel-to-user memcpy. This is why re-reading a file is dramatically faster than the first read.
- **On a miss, the thread blocks inside `sys_read`** (state D/S) until the disk's DMA completes and an interrupt fires. An HTTP server can't accept connections while its one thread is asleep in the kernel.

## The principle

Sync file I/O isn't slow because of JavaScript — it's one thin syscall away from the kernel. It's dangerous because the block happens _inside_ `read(2)`, taking the whole event loop hostage. Fine in scripts and startup code; never on a server's hot path.
