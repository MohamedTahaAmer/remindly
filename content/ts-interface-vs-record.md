# Why can't a TS `interface` be assigned to `Record<string, X>`?

Interfaces support declaration merging, so TS can't prove every possible key conforms to the index signature. Spread into a fresh object literal (`{ ...obj }`), use a `type` alias, or add an explicit index signature.

---

# `interface` vs `type` — why `Record<string, X>` rejects interfaces

The bug: `AuthenticatedUser` (an `interface`) was passed as `tags` where the expected type was `TagInputs = Record<string, string | number | null | undefined>`. TypeScript rejected it with:

> Index signature for type 'string' is missing in type 'AuthenticatedUser'.

## Why TS refuses

`Record<string, X>` carries an implicit index signature `{ [key: string]: X }`. To assign to it, TS must prove **every** possible string key maps to a value of type `X`. Interfaces are **open** — a later `interface AuthenticatedUser { ... }` declaration can merge new properties in. So TS can't make that proof and refuses up front.

A `type` alias is **closed** — TS knows the full key set and can verify each value matches.

## The 5 cases (see `packages/trigger/src/interface-vs-type.ts`)

```ts
type TagInputs = Record<string, string | number | null | undefined>

// 1. interface → Record: FAILS
interface UserInterface {
	id: number
	name: string | null
}
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
interface Mergeable {
	id: number
}
interface Mergeable {
	tag: string
} // legal — silently merges
```

## Why no `extend` keyword for merging?

Same-name interfaces in the same scope merge automatically — no `extend` keyword needed. The reason is historical and practical:

1. **Modeling JS reality** — globals, prototypes, the DOM all grow new properties at runtime. Without merging, you'd have to fork `lib.dom.d.ts` to add `window.myAnalytics`.
2. **Module augmentation** — libraries expect you to extend their types from your own code (e.g. `Express.Request` gaining `req.user`).
3. **Closed alternative exists** — if you want closed semantics, use `type`.

## Rule of thumb

- **`interface`** → open/extensible shapes: public APIs, library types, classes, anything other code might augment.
- **`type`** → closed shapes, unions, intersections, mapped/conditional types, assignability to `Record`/index-signature targets.

The bug fixed here was `interface` used where a closed shape was needed.
