import { config } from "dotenv"
import { eq } from "drizzle-orm"
import { db } from "#/db"
import { cards } from "#/db/schema"

config({ path: [".env.local", ".env"] })
type SeedCard = {
	front: string
	back: string
	detailsMarkdown: string | null
}

const seeds: SeedCard[] = [
	{
		front: "Why can't a TS `interface` be assigned to `Record<string, X>`?",
		back: "Interfaces support declaration merging, so TS can't prove every possible key conforms to the index signature. Spread into a fresh object literal (`{ ...obj }`), use a `type` alias, or add an explicit index signature.",
		detailsMarkdown: `# \`interface\` vs \`type\` — why \`Record<string, X>\` rejects interfaces

The bug: \`AuthenticatedUser\` (an \`interface\`) was passed as \`tags\` where the expected type was \`TagInputs = Record<string, string | number | null | undefined>\`. TypeScript rejected it with:

> Index signature for type 'string' is missing in type 'AuthenticatedUser'.

## Why TS refuses

\`Record<string, X>\` carries an implicit index signature \`{ [key: string]: X }\`. To assign to it, TS must prove **every** possible string key maps to a value of type \`X\`. Interfaces are **open** — a later \`interface AuthenticatedUser { ... }\` declaration can merge new properties in. So TS can't make that proof and refuses up front.

A \`type\` alias is **closed** — TS knows the full key set and can verify each value matches.

## The 5 cases (see \`packages/trigger/src/interface-vs-type.ts\`)

\`\`\`ts
type TagInputs = Record<string, string | number | null | undefined>

// 1. interface → Record: FAILS
interface UserInterface { id: number; name: string | null }
const tags1: TagInputs = userI // ❌

// 2. type alias → Record: WORKS
type UserType = { id: number; name: string | null }
const tags2: TagInputs = userT // ✅

// 3. spread interface into fresh object literal: WORKS (the fix used)
const tags3: TagInputs = { ...userI } // ✅

// 4. interface WITH explicit index signature: WORKS
interface UserInterfaceIndexed {
  [key: string]: string | number | null | undefined
  id: number
}

// 5. declaration merging proves why TS is strict:
interface Mergeable { id: number }
interface Mergeable { tag: string } // legal — silently merges
\`\`\`

## Why no \`extend\` keyword for merging?

Same-name interfaces in the same scope merge automatically — no \`extend\` keyword needed. The reason is historical and practical:

1. **Modeling JS reality** — globals, prototypes, the DOM all grow new properties at runtime. Without merging, you'd have to fork \`lib.dom.d.ts\` to add \`window.myAnalytics\`.
2. **Module augmentation** — libraries expect you to extend their types from your own code (e.g. \`Express.Request\` gaining \`req.user\`).
3. **Closed alternative exists** — if you want closed semantics, use \`type\`.

## Rule of thumb

- **\`interface\`** → open/extensible shapes: public APIs, library types, classes, anything other code might augment.
- **\`type\`** → closed shapes, unions, intersections, mapped/conditional types, assignability to \`Record\`/index-signature targets.

The bug fixed here was \`interface\` used where a closed shape was needed.`,
	},
	{
		front: "Why are macOS and Linux closer to each other than to Windows?",
		back: "Both macOS and Linux are POSIX-compliant Unix-like systems sharing the same lineage (Unix → BSD/System V), so they share the same syscalls, filesystem semantics, shell, and command-line tools. Windows descends from a separate DOS/NT codebase with different APIs (Win32), filesystem rules (drive letters, case-insensitive), and conventions.",
		detailsMarkdown: `# POSIX, Unix, and why macOS ≈ Linux ≠ Windows

## The lineage in one diagram

\`\`\`
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
\`\`\`

## What POSIX is

POSIX (Portable Operating System Interface) is an IEEE standard from 1988 that codified the **common API** of Unix-family systems: file descriptors, \`fork()\`/\`exec()\`, signals, pipes, \`/dev\`, the shell, core utilities (\`ls\`, \`grep\`, \`awk\`, \`sed\`), and case-sensitive hierarchical filesystems mounted under a single root \`/\`.

Both macOS and Linux are **POSIX-compliant**. They differ in implementation, but a program written to POSIX runs on both with minor changes. Windows is not POSIX-compliant in its mainline form — it has its own Win32 API, drive-letter filesystems, case-insensitive paths, different process/threading semantics, different signal model, and different shells (\`cmd\`, PowerShell).

## Why macOS feels like Linux

macOS is built on **Darwin**, which combines:

- the **XNU kernel** — a hybrid of Mach (microkernel concepts) and BSD (Unix internals)
- a **BSD userland** — \`/bin\`, \`/etc\`, \`/usr\`, the C library, the standard utilities

That heritage came from **NeXTSTEP**, Steve Jobs' company NeXT — built on BSD and Mach in the late 1980s. When Apple bought NeXT in 1996, NeXTSTEP became the foundation of Mac OS X (2001), and through it of modern macOS.

So when you open Terminal on a Mac and type \`ls\`, \`grep\`, \`ssh\`, or write a \`bash\`/\`zsh\` script, you're using tools that share a direct ancestor with the ones on Linux — both descended from Unix.

## Practical consequences

| Thing                        | macOS                | Linux                | Windows                                   |
| ---------------------------- | -------------------- | -------------------- | ----------------------------------------- |
| Filesystem root              | \`/\`                  | \`/\`                  | \`C:\\\`, \`D:\\\`, ...                          |
| Case sensitivity (default)   | insensitive\\*        | sensitive            | insensitive                               |
| Path separator               | \`/\`                  | \`/\`                  | \`\\\` (and sometimes \`/\`)                   |
| Line endings                 | \`\\n\`                | \`\\n\`                | \`\\r\\n\`                                    |
| Shell                        | \`zsh\`/\`bash\`         | \`bash\`/\`zsh\`/\`sh\`    | \`cmd\`, PowerShell (Bash via WSL)          |
| Process model                | \`fork\`/\`exec\`         | \`fork\`/\`exec\`         | \`CreateProcess\` (no \`fork\`)               |
| Package manager              | Homebrew (community) | apt/dnf/pacman/...   | winget / Chocolatey                       |
| Dev toolchain "just works"   | usually              | usually              | often needs WSL or adapters               |

\\*macOS uses HFS+/APFS which can be configured case-sensitive but defaults to insensitive — a common source of "works on Linux, not on Mac" CI bugs.

## Why this matters for developers

If you write a Node script, a Python tool, or a shell command on a Mac, it will almost certainly run on Linux unchanged. Move it to Windows and you'll likely hit path-separator, line-ending, or missing-tool issues — which is why **WSL** (Windows Subsystem for Linux) exists: it ships a real Linux kernel inside Windows so devs can opt into the POSIX world.

Microsoft has spent the last decade slowly closing that gap (WSL, PowerShell going cross-platform, native OpenSSH, native \`ssh-agent\`), but the underlying APIs and filesystem semantics remain different.

## TL;DR

macOS and Linux are siblings descended from Unix and both follow the POSIX standard. Windows is a cousin from a completely different family tree (DOS → NT) with its own native APIs. That's why moving code between macOS and Linux is usually trivial, and moving it to Windows often is not.`,
	},
]

let inserted = 0
let updated = 0

for (const c of seeds) {
	const [existing] = await db.select({ id: cards.id }).from(cards).where(eq(cards.front, c.front)).limit(1)

	if (existing.id) {
		await db.update(cards).set({ back: c.back, detailsMarkdown: c.detailsMarkdown }).where(eq(cards.id, existing.id))
		console.log(`Updated card #${existing.id}: ${c.front}`)
		updated++
	} else {
		const [res] = await db.insert(cards).values({
			front: c.front,
			back: c.back,
			detailsMarkdown: c.detailsMarkdown,
		})
		console.log(`Inserted card #${res.insertId}: ${c.front}`)
		inserted++
	}
}

console.log(`\nDone. ${inserted} inserted, ${updated} updated.`)
process.exit(0)
