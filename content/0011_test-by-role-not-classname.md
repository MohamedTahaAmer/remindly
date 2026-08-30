# Why query by ARIA role instead of by class name or HTML tag in tests?

tags: testing

The accessibility tree is the real contract of your UI; class names and tags are implementation details. A test that queries by role fails only when the _goal_ of the code changes — not when you rename a class or swap a `<div>` for a `<section>`. Querying by role also forces you to write accessible HTML to make the test pass.

---

# Test by role: couple to the accessibility tree, not the markup

## The accessibility tree

The accessibility tree is a machine-readable representation of a page's structure. Screen readers, search engines, and assistive technologies use it to navigate. It is built from the **ARIA roles** of elements — which you set either explicitly via the `role` attribute, or (better) implicitly by using the correct **HTML5 semantic element**, which assigns the right role automatically.

```html
<!-- implicit role="button" — preferred -->
<button>Save</button>

<!-- explicit role — needed when no semantic element fits -->
<div role="button" tabindex="0">Save</div>
```

## Why role over class name / tag

A test should fail when the **goal** of the code changes, not when its **implementation** changes.

- Class names (`.btn-primary`) and tag names (`div`, `span`) are implementation details. Refactor the styling or swap a wrapper element and a class/tag-based test breaks — even though the user-facing behavior is identical. That's a **false failure**.
- A role-based query (`getByRole("button", { name: "Save" })`) asks "is there still a button labeled Save?" — which is the actual goal. It survives refactors and only breaks when the meaningful contract changes.

## The bonus: accessibility for free

To query `getByRole("textbox", { name: "Email" })`, the input _must_ be reachable in the accessibility tree with that label. So writing role-based tests pressures you into producing accessible HTML — the test and the screen-reader user want the same thing.

## Rule of thumb

Query the way a user (or assistive tech) perceives the page: by role and accessible name. Reach for class names or test IDs only as a last resort when no role/label fits.
