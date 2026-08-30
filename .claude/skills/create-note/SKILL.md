---
name: create-note
description: Create a new Remindly flashcard note as a markdown file in content/ and push it to the database. Use when the user wants to add a note/card/flashcard, capture a lesson, or save something to study. Invoke when the user passes a topic, front/back text, or note content to turn into a card.
---

# create-note

Turn user-provided info into a Remindly flashcard: write a markdown file in `content/`, then upsert it into the database.

## Note file format

Content files live in `content/`, either flat or nested in subfolders (e.g. `content/01_ai-engineering/01_chapter-1-intro-to-building-ai-apps/0001_notes.md` — folders use a 2-digit `NN_slug` prefix). A file usually holds one card; a file may hold several cards separated by lines of `===` (three or more equals signs) — used for book-chapter note files where each chapter folder has one multi-card `NNNN_notes.md`. The seed parser (`scripts/seed.ts`) reads each card as exactly three parts:

```markdown
# <front — the question/title, inline markdown, single line>

tags: <comma-separated tag names — optional, lowercase>

<back — the short answer paragraph(s)>

---

<detailsMarkdown — optional longer explanation, any markdown>
```

Rules the parser enforces (don't violate them):

- First non-blank line **must** be `# <front>`. The text after `# ` becomes the card's `front`.
- An optional `tags: a, b, c` line may follow the title (first non-blank line after it). The seed creates missing tags and syncs the card's tag links to exactly this list. Prefer reusing existing tag names (check other files in `content/`) over inventing near-duplicates; lowercase, short, topic-like (`nodejs`, `typescript`, `testing`).
- The text between the title and the `---` separator becomes `back`. It is **required** — never leave it empty.
- Everything after the first `---` line becomes `detailsMarkdown` (optional). Omit the `---` and details entirely if there's nothing more to add.
- `front` ≤ 500 chars (it's a `varchar(500)`); `back` and details are `text`, so no practical length limit.

Study the existing files in `content/` (e.g. `0012_test-coverage-not-100.md`, `0001_building-guardrails-for-llm-code.md`) to match tone and structure: the `front` is a sharp question, the `back` is a tight summary, and details expand with headings, lists, and a closing principle.

## Steps

1. **Gather the content.** From what the user gave you, determine:
   - **front** — a clear question or title.
   - **back** — a concise answer (1–2 paragraphs).
   - **details** (optional) — a fuller explanation in markdown.

   If the user gave explicit front/back text, use it directly. If they gave only a rough topic, draft all three yourself in the house style.

2. **Pick a filename.** Files are named `NNNN_<slug>.md` — a 4-digit zero-padded sequence number, an underscore, then the slug. Derive the slug from the front by this transform: strip the leading `# `, lowercase, drop everything except `a–z 0–9` and spaces, collapse runs of spaces into a single `-`, trim leading/trailing `-`, cap at ~60 chars (e.g. `# Why isn't 100% coverage practical?` → `test-coverage-not-100` — shorten by hand if the literal transform is awkwardly long). For the number, use the highest existing prefix + 1 _within the target folder_ — numbering is per-folder, so the flat `content/` files and each nested subfolder have their own sequences (e.g. if `0016_…` is the highest in `content/`, the next flat file is `0017_<slug>.md`). But first check `content/`: if an existing file's `front` matches this card's (trim and collapse internal whitespace, case-sensitive), reuse that file — same number and name — so the seed _updates_ that card instead of inserting a duplicate.

3. **Always write the file** to `content/<name>.md` using the format above — do this on every run, whether the content was explicit or drafted. Then proceed straight to step 4 — always run the seed after creating a note, without waiting for approval. (If the user later asks for changes, edit the file and re-run the seed; it's an idempotent upsert.)

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
