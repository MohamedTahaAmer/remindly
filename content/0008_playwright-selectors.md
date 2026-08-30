# What are the Playwright selectors, which is recommended, and what are their trade-offs?

tags: playwright, testing

Prefer **user-facing locators** in this order: `getByRole` → `getByLabel` / `getByPlaceholder` → `getByText` → `getByTestId`, and use CSS/XPath only as a last resort. Role-based queries are the recommended default because they assert what the user (and assistive tech) actually perceives, so they survive refactors and break only when behavior changes.

---

# Playwright locators — the full menu, recommended order, and trade-offs

Playwright deliberately steers you toward **locators** (lazy, auto-waiting, auto-retrying handles) rather than raw selectors. The guidance mirrors Testing Library: query the page the way a user does, not the way the markup happens to be structured.

## Recommended priority order

1. `getByRole` — by ARIA role + accessible name
2. `getByLabel` — form controls by their `<label>`
3. `getByPlaceholder` — inputs without a visible label
4. `getByText` — non-interactive content
5. `getByAltText` / `getByTitle` — images and `title` attributes
6. `getByTestId` — escape hatch when nothing semantic fits
7. CSS / XPath — last resort

## The selectors, with pros and cons

### `getByRole(role, { name })` — **the default**

Queries the accessibility tree, e.g. `getByRole("button", { name: "Save" })`.

- **Pros:** matches what the user/screen-reader perceives; survives class/tag refactors; failing tests signal a real behavior change; doubles as an accessibility check (the element _must_ be in the a11y tree to match).
- **Cons:** requires you to understand ARIA roles and accessible-name computation; awkward for purely decorative or non-semantic elements.

### `getByLabel(text)` — **forms**

The right tool for inputs: `getByLabel("Email")`.

- **Pros:** the canonical, accessible way to target form fields; resilient to markup changes; enforces that inputs are properly labeled.
- **Cons:** only works when the control is actually associated with a label (`for`/`id`, wrapping, or `aria-label`); breaks if labeling is missing — though that's a real bug worth surfacing.

### `getByPlaceholder(text)`

For inputs that lack a visible label.

- **Pros:** convenient for search boxes and minimal forms.
- **Cons:** placeholders aren't a substitute for labels (an a11y smell); placeholder text changes for copy/i18n reasons, making it brittle. Prefer `getByLabel`.

### `getByText(text)`

For non-interactive content like paragraphs and headings.

- **Pros:** intuitive; great for asserting visible copy.
- **Cons:** brittle against copy edits and i18n; matches can be ambiguous (substring vs exact); shouldn't be used to click interactive elements — use `getByRole` for those.

### `getByAltText` / `getByTitle`

Images via `alt`, elements via the `title` attribute.

- **Pros:** semantic for media; `alt` is an accessibility requirement anyway.
- **Cons:** narrow applicability; `title` is inconsistently exposed and rarely a strong contract.

### `getByTestId("...")` — **the escape hatch**

Matches `data-testid` (configurable).

- **Pros:** completely decoupled from copy, styling, and structure — maximally stable; explicit "this is here for tests" intent.
- **Cons:** asserts nothing about user-facing behavior or accessibility; pollutes markup with test-only attributes; a test can pass while the feature is broken for real users. Use only when no semantic locator fits.

### CSS / XPath — **last resort**

`page.locator(".btn-primary")`, `page.locator("xpath=//div[...]")`.

- **Pros:** can reach anything; sometimes the only way to target third-party or non-semantic DOM.
- **Cons:** tightly coupled to implementation details — class renames and DOM restructures cause false failures; tests no longer track the _goal_ of the code. XPath especially is verbose and fragile.

## Why this order (the principle)

A test should fail when the **goal** of the code changes, not its **implementation**. The higher locators (role, label) bind to the contract the user experiences; the lower ones (CSS, XPath) bind to incidental structure. Climbing the list trades fragility for meaning — and as a bonus, the recommended locators only pass when your UI is accessible.

## Handy refinements

- **Chaining / filtering:** `page.getByRole("listitem").filter({ hasText: "Active" })` scopes within a region.
- **Strictness:** locators throw if they match more than one element — forcing you to disambiguate rather than silently grabbing the first.
- **Codegen:** `npx playwright codegen` records actions and emits role-first locators, nudging you toward the recommended style.
