# In playwright.config.ts, which options go inside `use` and which go at the top level?

`use` configures the **browser context** (`baseURL`, `trace`, `screenshot`, `storageState`, `viewport`). Everything else — `testDir`, `timeout`, `retries`, `workers`, `projects` — is a **runner option** and belongs at the top level of `defineConfig`. The trap: put a runner option like `timeout` inside `use` and Playwright **silently ignores it** — no error, no warning. It just doesn't apply. Beyond that, keep the starter config tiny and add layers only when earned: `webServer` → `baseURL` → traces/screenshots → projects.

Source: [Configuring Playwright — Steve Kinney](https://stevekinney.com/courses/self-testing-ai-agents/configuring-playwright)

---

# Reading and extending playwright.config.ts

The config file is the contract between your suite and your environment. A starter should keep that contract small enough to understand in one pass, then grow deliberately.

## The anti-pattern: runner options inside `use`

This is the most common Playwright config mistake, and Playwright won't save you from it.

```ts
// Wrong — silently ignored:
use: {
  timeout: 60_000,
},

// Right — actually changes the test timeout:
timeout: 60_000,
```

The mental model:

- **`use` configures the browser context** — `baseURL`, `trace`, `screenshot`, `storageState`, `viewport`.
- **everything else configures the runner** — `testDir`, `timeout`, `retries`, `workers`, `projects`.

If you misplace a runner option, there's no error and no warning — it's just dropped. The only symptom is behavior that never changes no matter what you set.

## What a tiny starter actually ships

- **`testDir` / `testIgnore`** — where specs live, and what to exclude. Good use of `testIgnore`: known teaching fixtures or generated files. Bad use: hiding flaky real tests — fix the spec instead.
- **`webServer`** — how Playwright boots the app before any test. Prefer **build + preview over the dev server**: no HMR, no runtime Vite transforms, no dev-only middleware, so a pass against preview is far more likely to hold in CI and prod.
- **`use: { baseURL }`** — lets you write `page.goto('/playground')` instead of hardcoding the host everywhere, keeping tests portable.

## Layers you add once earned

- **CI-aware `webServer`:** `reuseExistingServer: !process.env.CI` — reuse a running local server, always boot fresh in CI. `env: {...}` here is the right place for test-only env overrides.
- **Failure forensics in `use`:** `trace: 'retain-on-failure'`, `screenshot: 'only-on-failure'`, `video: 'retain-on-failure'` — keep evidence on failure, discard success noise.
- **Runner options:** `fullyParallel`, `workers` (leave undefined in CI if you want parallelism — pinning `workers: 1` defeats `fullyParallel`), `forbidOnly: !!process.env.CI` (fails CI on a stray `test.only`), `retries: process.env.CI ? 2 : 0`.
- **Reporters:** `list` (terminal), `html` (browsable failures/traces), `json` (machine-readable for CI).
- **`projects`:** add only with a concrete reason — auth setup with `dependencies: ['setup']` + saved `storageState`, public vs. authenticated suites, cross-browser _smoke only_, or an isolated visual-regression project.

## The principle

A config file trying to teach auth setup, cross-browser, visual regression, CI retries, and reporting all at once is doing too much. Start tiny, and remember the one rule that prevents silent failures: `use` is the browser context; everything else is the runner.
