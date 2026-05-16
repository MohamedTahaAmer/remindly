# CLAUDE.md

Project: **Remindly** — a spaced-repetition flashcard app for personal lessons.

## Stack

- TanStack Start (Vite + React 19 + file-based router)
- tRPC for the API layer
- Drizzle ORM + MySQL
- Tailwind v4

## Critical rules

- The dev server is assumed to be running — never run `bun run dev` yourself. Use `curl` against `http://localhost:3000` to test.
- Keep `.env.local` and `src/env.ts` in sync when adding env vars.
- The DB env var is `DATABASE_URI` (not `DATABASE_URL`). The drizzle config and `src/db/index.ts` read from it.
- MySQL connection: `mysql://root:qqqq@localhost:3306/remindly`.

## Domain model

- **Card** — a lesson. Has `front` (prompt), `back` (answer), optional `details_markdown` (long-form lesson, rendered on its own page).
- **CardReview** — append-only log of every review. Stores the rating and the next scheduled date.
- **Schedule** — fixed ladder of intervals (1d, 3d, 1w, 2w, 1m, 3m, 6m, 1y), with SM-2-style rating modifiers:
  - `again` → reset to step 0
  - `hard` → repeat the current step
  - `good` → advance one step
  - `easy` → skip a step
- A card's "current step" is derived from the latest review row.

## Daily queue

- Cards whose latest `scheduled_for` is `<= today` are due.
- The queue also includes K random non-due cards (the "outside-schedule" reminders).
- A "Surprise me" button on the home page pulls N random cards ad-hoc.

## Scripts

```sh
bun run db:generate      # generate migration from schema
bun run db:push          # push schema to MySQL
bun run db:studio        # open drizzle studio
bun run lint
bun run check            # prettier
```
