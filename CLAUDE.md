# CLAUDE.md

Project: **Remindly** — a spaced-repetition flashcard app for personal lessons, plus local tools (video editor, paste boards).

Bun workspace monorepo (modeled on `4_minvo`):

- `apps/web` — TanStack Start app (frontend + NestJS-style backend in `src/server/{modules,common,infrastructure}`)
- `packages/db` — `@remindly/db`: drizzle schema + mysql2 client, drizzle-kit config
- `packages/config` — `@remindly/config`: env loading + zod-validated `serverConfig`, anchored to the workspace root
- `packages/ai` — `@remindly/ai`: `askClaude()` structured calls through the local Claude Code CLI (subscription auth, no API key)
- `packages/utils` — `@remindly/utils`: `Logger`, promisified `run` (spawn)

Packages export raw `.ts` (no build step); the app bundles them via `ssr.noExternal`. Run scripts from the root (`bun run dev|build|preview|db:push|db:seed` — they proxy with `--cwd`). `.env.local` and `_local/` (runtime data, gitignored) live at the workspace root.
