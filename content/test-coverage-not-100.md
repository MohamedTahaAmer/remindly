# Why isn't 100% test coverage practical (e.g. testing Google OAuth)?

Some code shouldn't be tested. Google OAuth is a third-party service, it actively blocks automated logins (so tests become a cat-and-mouse game), and chasing 100% coverage pushes you to stop mocking external services — which explodes the complexity of the test setup. Coverage is a tool, not a goal.

---

# 100% coverage is a vanity metric — don't test what you don't own

The instinct to hit "100%" treats every line as equally worth testing. It isn't. The cost of a test is not just writing it once — it's maintaining it forever, and a brittle test that fails for the wrong reasons is worse than no test.

## The Google OAuth case

Testing your own login _button_ and your _session handling_ is valuable. Testing the actual round-trip through Google's OAuth servers is not:

1. **It's a third-party service.** You don't own it, you can't fix it, and its correctness is Google's responsibility — not something your CI should be asserting.
2. **Google blocks automated logins.** Their anti-bot systems are designed to stop exactly what an end-to-end test does. So you'd be in a permanent cat-and-mouse game: your test passes, Google tightens detection, your test breaks — and the break tells you nothing about _your_ code.
3. **It forces you to stop mocking external services.** Pursuing total coverage means hitting real APIs, real networks, real rate limits — multiplying the complexity, flakiness, and runtime of the whole suite.
4. **It pushes you to write flaky tests, and no test beats a test that fails for the wrong reason.** A flaky test costs dev time on every red run, trains the team to ignore failures, and — worst of all — drowns out genuinely critical failures so they aren't spotted early. A gap in coverage is honest; a test that cries wolf actively hides real breakage.

## What to test instead

- **The boundary you own** — that you redirect to the provider, and that when a token comes back you create the right session. Mock the provider's response.
- **Your business logic** — the parts that break when _you_ change something, not when Google does.

## The principle

Coverage measures lines executed, not behavior verified. A suite at 80% coverage testing the right things beats one at 100% that's slow, flaky, and coupled to services you don't control. Test what you own and what's risky; mock or skip the rest.
