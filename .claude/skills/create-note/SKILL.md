---
name: create-note
description: Create a new Remindly flashcard note as a markdown file in content/ and push it to the database. Use when the user wants to add a note/card/flashcard, capture a lesson, or save something to study. Invoke when the user passes a topic, front/back text, or note content to turn into a card.
---

# create-note

Turn user-provided info into a Remindly flashcard: write a markdown file in `content/`, then upsert it into the database.

## Note file format

Each card is one `.md` file in `content/`. The seed parser (`scripts/seed.ts`) reads it as exactly three parts:

```markdown
# <front — the question/title, inline markdown, single line>

<back — the short answer paragraph(s)>

---

<detailsMarkdown — optional longer explanation, any markdown>
```

Rules the parser enforces (don't violate them):

- First non-blank line **must** be `# <front>`. The text after `# ` becomes the card's `front`.
- The text between the title and the `---` separator becomes `back`. It is **required** — never leave it empty.
- Everything after the first `---` line becomes `detailsMarkdown` (optional). Omit the `---` and details entirely if there's nothing more to add.
- `front` ≤ 500 chars (it's a `varchar(500)`); `back` and details are `text`, so no practical length limit.

Study the existing files in `content/` (e.g. `test-coverage-not-100.md`, `building-guardrails-for-llm-code.md`) to match tone and structure: the `front` is a sharp question, the `back` is a tight summary, and details expand with headings, lists, and a closing principle.

## Steps

1. **Gather the content.** From what the user gave you, determine:
   - **front** — a clear question or title.
   - **back** — a concise answer (1–2 paragraphs).
   - **details** (optional) — a fuller explanation in markdown.

   If the user gave explicit front/back text, use it directly. If they gave only a rough topic, draft all three yourself in the house style.

2. **Pick a filename.** Derive it from the front by this transform: strip the leading `# `, lowercase, drop everything except `a–z 0–9` and spaces, collapse runs of spaces into a single `-`, trim leading/trailing `-`, cap at ~60 chars, append `.md` (e.g. `# Why isn't 100% coverage practical?` → `test-coverage-not-100.md` — shorten by hand if the literal transform is awkwardly long). Then check `content/`: if an existing file's `front` matches this card's (trim and collapse internal whitespace, case-sensitive), reuse that filename so the seed _updates_ that card instead of inserting a duplicate.

3. **Always write the file** to `content/<name>.md` using the format above — do this on every run, whether the content was explicit or drafted. **Then stop and wait for the user's reply.** Tell them the file was written and that they can read/edit it directly, and that you'll seed once they approve. Proceed to step 4 only on an approval ("yes" / "looks good" / "go" / "seed it" / similar); if they ask for changes, edit the file and stop again; do not seed until they approve.

4. **Push to the DB.** Run:

   ```bash
   bun run db:seed
   ```

   This is idempotent: it upserts every file in `content/` by `front` (insert if new, update if the front already exists). It prints which cards were inserted/updated. Requires `DATABASE_URI` (loaded from `.env.local`).

5. **Report** the created filename and the seed output line for this card (e.g. `Inserted card #42: <front>`).

## Notes

- The seed touches _all_ content files, but only changes rows whose `front`/`back`/details differ, so running it to add one note is safe.
- Don't set `intervalIndex`, `scheduledFor`, etc. — those are scheduling fields the app manages; new cards get the schema defaults.
- If `bun run db:seed` fails on a missing `DATABASE_URI`, the file is still written — tell the user the file was created but the DB push needs the env var.
