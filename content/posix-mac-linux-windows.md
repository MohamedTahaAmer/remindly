# Why are macOS and Linux closer to each other than to Windows?

Both macOS and Linux are POSIX-compliant Unix-like systems sharing the same lineage (Unix → BSD/System V), so they share the same syscalls, filesystem semantics, shell, and command-line tools. Windows descends from a separate DOS/NT codebase with different APIs (Win32), filesystem rules (drive letters, case-insensitive), and conventions.

---

# POSIX, Unix, and why macOS ≈ Linux ≠ Windows

## The lineage in one diagram

```
        1969 — Unix at Bell Labs (Ken Thompson, Dennis Ritchie)
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
      BSD                System V             (others)
   (Berkeley)           (AT&T)
        │                   │
        ▼                   │
    NeXTSTEP                │
    (Steve Jobs' NeXT)      │
        │                   │
        ▼                   │
    Mac OS X / macOS        │       Linux kernel (Linus Torvalds, 1991)
                            │       + GNU userland (Stallman, 1984)
                            ▼
                         POSIX (1988, standardized common Unix API)

  Windows: DOS (1981) → NT (1993) — completely separate codebase, separate API.
```

## What POSIX is

POSIX (Portable Operating System Interface) is an IEEE standard from 1988 that codified the **common API** of Unix-family systems: file descriptors, `fork()`/`exec()`, signals, pipes, `/dev`, the shell, core utilities (`ls`, `grep`, `awk`, `sed`), and case-sensitive hierarchical filesystems mounted under a single root `/`.

Both macOS and Linux are **POSIX-compliant**. They differ in implementation, but a program written to POSIX runs on both with minor changes. Windows is not POSIX-compliant in its mainline form — it has its own Win32 API, drive-letter filesystems, case-insensitive paths, different process/threading semantics, different signal model, and different shells (`cmd`, PowerShell).

## Why macOS feels like Linux

macOS is built on **Darwin**, which combines:

- the **XNU kernel** — a hybrid of Mach (microkernel concepts) and BSD (Unix internals)
- a **BSD userland** — `/bin`, `/etc`, `/usr`, the C library, the standard utilities

That heritage came from **NeXTSTEP**, Steve Jobs' company NeXT — built on BSD and Mach in the late 1980s. When Apple bought NeXT in 1996, NeXTSTEP became the foundation of Mac OS X (2001), and through it of modern macOS.

So when you open Terminal on a Mac and type `ls`, `grep`, `ssh`, or write a `bash`/`zsh` script, you're using tools that share a direct ancestor with the ones on Linux — both descended from Unix.

## Practical consequences

| Thing                        | macOS                | Linux                | Windows                                   |
| ---------------------------- | -------------------- | -------------------- | ----------------------------------------- |
| Filesystem root              | `/`                  | `/`                  | `C:\`, `D:\`, ...                          |
| Case sensitivity (default)   | insensitive\*        | sensitive            | insensitive                               |
| Path separator               | `/`                  | `/`                  | `\` (and sometimes `/`)                   |
| Line endings                 | `\n`                 | `\n`                 | `\r\n`                                    |
| Shell                        | `zsh`/`bash`         | `bash`/`zsh`/`sh`    | `cmd`, PowerShell (Bash via WSL)          |
| Process model                | `fork`/`exec`        | `fork`/`exec`        | `CreateProcess` (no `fork`)               |
| Package manager              | Homebrew (community) | apt/dnf/pacman/...   | winget / Chocolatey                       |
| Dev toolchain "just works"   | usually              | usually              | often needs WSL or adapters               |

\*macOS uses HFS+/APFS which can be configured case-sensitive but defaults to insensitive — a common source of "works on Linux, not on Mac" CI bugs.

## Why this matters for developers

If you write a Node script, a Python tool, or a shell command on a Mac, it will almost certainly run on Linux unchanged. Move it to Windows and you'll likely hit path-separator, line-ending, or missing-tool issues — which is why **WSL** (Windows Subsystem for Linux) exists: it ships a real Linux kernel inside Windows so devs can opt into the POSIX world.

Microsoft has spent the last decade slowly closing that gap (WSL, PowerShell going cross-platform, native OpenSSH, native `ssh-agent`), but the underlying APIs and filesystem semantics remain different.

## TL;DR

macOS and Linux are siblings descended from Unix and both follow the POSIX standard. Windows is a cousin from a completely different family tree (DOS → NT) with its own native APIs. That's why moving code between macOS and Linux is usually trivial, and moving it to Windows often is not.
