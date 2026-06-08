# How do generics and mixins combine when a function returns a class in TypeScript?

A class is a **value**, so a function can return one — and that unlocks two patterns. With **generics**, a function's type parameter bakes into the class it returns: `SimpleMemoryDatabase<T>()` hands back a class whose methods are already typed to `T`, so `SimpleMemoryDatabase<string>()` is a real `StringDatabase` class. With **mixins**, a function takes a class and returns an *extended* one: typed `Base: Constructor<...>`, it `extends Base` and adds methods. The two compose — you can feed a generic factory's class straight into a mixin.

---

# Generic class factories and class-factory mixins

Because a class is just a value you can pass and return, two patterns fall out — one driven by **generics**, one by **mixins**. (The lead-up: a function can return a closure, or `new` an inline *class expression* and return the instance. The interesting cases return the **class itself**.)

## Generics: a factory that specializes a class to a type

```ts
function SimpleMemoryDatabase<T>() {
  return class SimpleMemoryDatabase {
    private db: Record<string, T> = {};
    set(id: string, value: T): void { this.db[id] = value; }
    get(id: string): T { return this.db[id]; }
    getObject(): Record<string, T> { return this.db; }
  };
}

const StringDatabase = SimpleMemoryDatabase<string>();
const sdb1 = new StringDatabase();
sdb1.set("name", "Jack");   // value is typed to string
```

A class can't take a type argument that flows into its field types at `new` time. So you **parameterize the function instead**: `SimpleMemoryDatabase<T>` closes over `T` and returns a class with `T` already substituted everywhere. `StringDatabase` is then a normal class — `new` it, store it, subclass it. One factory, infinitely many type-specialized classes.

## Mixins: a function that takes a class and returns an extended one

```ts
// "anything you can `new` to get a T"
type Constructor<T> = new (...args: any[]) => T;

function Dumpable<T extends Constructor<{ getObject(): object }>>(Base: T) {
  return class Dumpable extends Base {
    dump() {
      console.log(this.getObject());
    }
  };
}
```

This is TypeScript's **class-factory mixin**. `Constructor<T>` is the type of a constructor, and the constraint `T extends Constructor<{ getObject(): object }>` means *Dumpable accepts any class that has `getObject()`* — that's the contract the added behavior depends on. It returns a subclass that `extends Base` and layers a `dump()` method on top. Unlike the `interface` + `applyMixins` approach, types and runtime can't drift apart here: you genuinely `extends Base`, so TypeScript infers the combined shape for free.

## The two compose

```ts
const DumpableStringDatabase = Dumpable(StringDatabase);
const sdb2 = new DumpableStringDatabase();
sdb2.set("name", "Jack");   // from the generic factory
sdb2.dump();                // from the mixin
```

`StringDatabase` (from the generic factory) satisfies `Constructor<{ getObject(): object }>`, so it drops straight into the `Dumpable` mixin. The result has both the type-specialized `set`/`get` **and** the mixed-in `dump`.

## The principle

Generics let a factory **specialize** a class to a type; mixins let a function **extend** any class that meets a `Constructor<T>` contract. Both rely on the same fact — classes are values — and because they're just functions over classes, they compose cleanly.
