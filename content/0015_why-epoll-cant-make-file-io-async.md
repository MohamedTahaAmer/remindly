# Why can't epoll make regular-file I/O asynchronous?

tags: nodejs, os

epoll (like `select`/`poll`) is a _readiness_ API: "tell me when this fd has data." A regular file is _always_ readable — `epoll_ctl` on one even returns `EPERM`. The blocking doesn't happen at "is data available?"; it happens _inside_ `read(2)` while the disk seeks. Readiness is meaningless for files, so the model that lets one thread juggle 100k sockets simply cannot express "the disk is slow" — which is why Node fakes async file I/O with a thread pool instead.

---

# Readiness vs completion: the dirty secret of regular files

You'd expect async file I/O to work like async sockets: register the fd with epoll, get notified when it's readable, then read without blocking. It doesn't work, and this is the single most important fact about Node's I/O architecture.

## What epoll is actually for

epoll serves things that can be _not ready yet_: sockets, pipes, TTYs, signals, timers, eventfds. For those, "readable" is a real state transition — bytes arrived from the network, someone wrote to the pipe. One thread parked in `epoll_wait` can multiplex enormous numbers of them, because the waiting _is_ the work.

## Why files break the model

- A regular file always "has data" — the kernel considers it permanently readable and writable. `epoll_ctl(EPOLL_CTL_ADD)` on a regular file fails with `EPERM`.
- The latency lives _inside_ the `read(2)` call: page-cache miss → block layer → disk seek/DMA → sleep. There is no earlier moment where the kernel could say "not ready, come back later."
- So a readiness notification for a file would fire instantly and you'd block on the read anyway.

## The consequences

- Node/libuv fake async file I/O by running _blocking_ reads on a thread pool; epoll's only role there is as a completion _doorbell_ (the worker signals an eventfd that the loop is watching).
- File-I/O concurrency is therefore bounded by _thread count_, not fd count — completely unlike sockets.
- Fixing this properly required a new kernel API built on _completion_ rather than readiness: io_uring ("here's a request; tell me when it's done").

## The principle

epoll answers "which fds are ready?" — a question that makes no sense for files, where the cost is the transfer itself. Readiness-based multiplexing is for sockets; files need either sacrificial threads or a completion-based API.
