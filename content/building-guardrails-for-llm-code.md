# In the LLM era, what is the job — writing code or building guardrails?

Increasingly the work isn't typing code, it's building the **systems and guardrails** (tests, types, linters, reviews, CI) that raise the quality of LLM-written code. The LLM produces the lines; your harness guarantees they're worth keeping. "High quality" means four things at once: **working, performant, secure, and readable.**

---

# Building systems and guardrails around LLM-generated code

## The shift

The bottleneck has moved. An LLM can generate large volumes of plausible code quickly, but plausible ≠ correct, fast, safe, or maintainable. The valuable human (and tooling) contribution is no longer the keystrokes — it's the **guardrails that catch the difference** between code that looks right and code that *is* right.

So the role shifts from author to **systems builder**: designing the tests, type contracts, linters, schema validation, code review, and CI gates that constrain what bad output can survive.

## What "high quality" means

Quality is not one axis. Code is high quality only when it is all four of:

1. **Working** — it does what it's supposed to; verified by tests, not vibes.
2. **Performant** — it doesn't waste time, memory, or queries at the scale it runs.
3. **Secure** — it doesn't leak data, trust unvalidated input, or open injection/authz holes.
4. **Readable** — a human (or the next LLM pass) can understand and safely change it.

An LLM will happily produce code that nails one or two of these while quietly failing the rest. Guardrails exist to make all four non-negotiable.

## The guardrails, mapped

| Goal        | Guardrail that enforces it                                  |
| ----------- | ----------------------------------------------------------- |
| Working     | Unit/integration tests, type system, CI must-pass gates     |
| Performant  | Benchmarks, query/log analysis, profiling, load tests       |
| Secure      | Static analysis, dependency scanning, security review, authz tests |
| Readable    | Linters, formatters, code review, naming/structure conventions |

## The principle

You don't trust the generator; you trust the **system around it**. Invest in the guardrails and the LLM's output rises to meet them. Skip them and you've just sped up the production of code you can't trust.
