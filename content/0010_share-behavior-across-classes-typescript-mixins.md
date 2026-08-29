# How do you share behavior across classes when a class can only extend one parent? (TypeScript mixins)

**The problem:** a class can only `extends` one parent, but you often want one class to pull in capabilities from several independent sources (jumping, ducking, serializing...). Single inheritance can't express that. **Mixins** are the workaround — reusable bundles of behavior you graft onto a class.

**The solution in TypeScript:** grafting a mixin onto a class means updating it on two layers that must stay in sync — there's no native `mixin` keyword to do it for you.

1. **Update the type.** This is the easy half. Declare an `interface` with the **same name as the base class** and have it `extends` the mixins. TypeScript lets interfaces grow — a same-named `interface` and `class` are merged (_declaration merging_), so the base type now also reports the mixins' members to the type checker.
2. **Update the runtime behavior.** This is the hard half. JS has no concept of mixins, and TypeScript ships no polyfill, so you do it by hand: copy each mixin's prototype methods onto the base class with a small `applyMixins` helper.

So you write each mixin as a plain ES class, then satisfy both layers separately: the `interface` satisfies the type checker, and `applyMixins` satisfies the JS engine. Do only one and they fall out of sync — code that compiles but crashes, or runs but won't type-check.

---

# Mixins: the alias pattern (interface merge + runtime copy)

A mixin lets a class reuse behavior from several sources without single-inheritance limits. TypeScript implements this as a _convention_, not a language feature — you keep the type layer and the runtime layer in sync by hand.

## The three pieces

```ts
// 1. Each mixin is a traditional ES class
class Jumpable {
	jump() {
		console.log("Jump!")
	}
}

class Duckable {
	duck() {}
}

// The base class
class Sprite {
	x = 0
	y = 0
}

// 2. Merge the TYPES: an interface with the same name as the base
//    declaration-merges the mixin members onto Sprite's type.
interface Sprite extends Jumpable, Duckable {}

// 3. Merge the BEHAVIOR: copy prototype members at runtime.
applyMixins(Sprite, [Jumpable, Duckable])

const player = new Sprite()
player.jump() // OK — type + runtime both present
console.log(player.x, player.y)
```

## The helper

```ts
// This can live anywhere in your codebase:
function applyMixins(derivedCtor: any, constructors: any[]) {
	constructors.forEach((baseCtor) => {
		Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
			Object.defineProperty(derivedCtor.prototype, name, Object.getOwnPropertyDescriptor(baseCtor.prototype, name) || Object.create(null))
		})
	})
}
```

## Why two separate steps

- **The `interface Sprite extends ...`** does nothing at runtime — it only tells the type checker that a `Sprite` _has_ `jump()` and `duck()`. Without it, `player.jump()` is a type error.
- **`applyMixins`** does nothing for the types — it physically copies each method descriptor from the mixin prototypes onto the base prototype. Without it, `player.jump()` is `undefined` at runtime.

If you do only one, you get a mismatch: code that compiles but crashes, or runs but won't type-check.

## Gotchas

- It only copies **prototype members** (methods). Instance fields set in a mixin's constructor are **not** copied — keep mixins method-only, or initialize that state in the base.
- The `interface` must share the **exact name** of the base class for declaration merging to fire.

## The principle

A mixin in TS is a handshake between two layers you maintain manually: an `interface` for the type checker and `applyMixins` for the runtime. Keep both lists identical.
