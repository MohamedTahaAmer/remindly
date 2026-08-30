# What are Playwright projects, and why do they turn a test suite into a dependency graph?

tags: playwright, testing

A **project** is a named config block inside `playwright.config.ts` with its own settings (browser, `testMatch`/`testDir`, `storageState`) and, critically, its own `dependencies` on other projects. Playwright builds a **directed acyclic graph** from those edges and guarantees order: if `setup` runs before `chromium` and `firefox`, declare `dependencies: ['setup']` on each — and if `setup` fails, its dependents are _skipped_, not run. This replaces fragile `beforeAll`/`globalSetup` ordering with a structural graph: roots run first, independent nodes run in parallel, and `teardown` projects run after their dependents finish.

Source: [Playwright Projects — Steve Kinney](https://stevekinney.com/courses/self-testing-ai-agents/playwright-projects)

---

# Playwright projects as a dependency graph

Most suites start as "one config, one browser, run everything." That breaks the moment something must happen _before_ the tests — seeding a DB, logging in, generating fixtures. Stuffing that into `beforeAll` and hoping the order works out is the fragile path. **Projects** make the ordering structural.

## A project + its dependencies

```ts
projects: [
	{ name: "setup", testMatch: /global\.setup\.ts/ },
	{
		name: "chromium",
		use: { ...devices["Desktop Chrome"] },
		dependencies: ["setup"],
	},
	{
		name: "firefox",
		use: { ...devices["Desktop Firefox"] },
		dependencies: ["setup"],
	},
]
```

`setup` runs first, always. Then `chromium` and `firefox` run **in parallel** (they depend on `setup`, not each other). If `setup` fails, neither browser project starts. It's a DAG, not a hook chain — you declare what depends on what, and Playwright resolves the rest.

## `testMatch` vs `testDir`

Two settings scope which files a project runs:

- **`testMatch`** — a regex/glob filtering test files. Setup projects almost always use it to isolate their one file: `testMatch: /authentication\.setup\.ts/`.
- **`testDir`** — scopes a project to a directory (e.g. `tests/authenticated`).

Set neither and the project runs everything the top-level config would find.

## Setup and teardown projects

A setup project is **an ordinary Playwright test file**, not a hidden callback — that's the key insight. It gets fixtures, `page`/`request`, trace viewer, and a clickable HTML report entry, all of which `globalSetup` lacks.

`teardown` is its counterpart — a project that runs _after_ all dependents finish, for cleanup that would otherwise leak across runs:

```ts
projects: [
	{ name: "setup", testMatch: /global\.setup\.ts/, teardown: "cleanup" },
	{ name: "cleanup", testMatch: /global\.teardown\.ts/ },
	{ name: "chromium", use: { ...devices["Desktop Chrome"] }, dependencies: ["setup"] },
]
```

Order: `setup` → `chromium` → `cleanup`. The teardown file is just a tiny test (`import { test as teardown }`) that removes what setup created — a temp DB, seeded users, a running service. Skip it when setup simply overwrites its own output each run (e.g. an auth state file).

## Project-level overrides

Each project overrides top-level settings (they **override, not merge**):

```ts
defineConfig({
	retries: 0,
	timeout: 30_000,
	projects: [
		{ name: "smoke", testMatch: /smoke\/.+\.spec\.ts/, retries: 2, timeout: 10_000 },
		{ name: "full", retries: 0, timeout: 60_000 },
	],
})
```

## Running a subset

- `--project=chromium` — runs that project **and its dependencies** (so `setup` still runs).
- `--project=chromium --no-deps` — runs _only_ chromium, skipping setup/teardown. A local-iteration shortcut, not for CI.

## What not to do

- **Don't use `globalSetup` for auth** — it runs outside the runner: no fixtures, no trace, no report. The official docs moved entirely to the project-based pattern.
- **Don't create a project per test file.** Projects are _configuration boundaries_ (browser, role, environment). Files sharing a browser + `storageState` belong in one project.
- **Remember a failing dependency skips its dependents.** A feature (no point testing authed flows if login broke) — but a flaky setup project silently skips the whole suite. Seeing "0 tests ran" in CI? Check the setup project first.

## The principle

Think of projects as a mini build graph — like Make, Turborepo, or Nx applied to test execution. Each node has inputs (which tests, which browser, which state) and edges (dependencies); Playwright runs roots first and parallelizes the rest. Model real, shared prerequisites as nodes in that graph instead of as tribal knowledge in a shell script.
