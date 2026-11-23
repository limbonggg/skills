---
name: judge-tests
description: Use when the tests themselves are in question — "are these tests any good", "flaky", "review the tests in this PR", "is this snapshot worth it", "should I mock this", "this test broke on a rename", "can we just delete this test". Not for writing the test before the change (use red-green), confirming a run is green (use prove-it), or judging schema and module shape (use judge-data, judge-architecture).
domain: lenses
risk: reads
invocation: model
version: 0.1.0
metadata:
  form: recipe
  baseline: green-suite-that-asserts-nothing
  eval: evals/
---

# Judge Tests

A test's worth is the set of wrong implementations it rejects. This lens reads a suite — or a diff's
tests — for what it catches, where it sits, what it fakes, and what makes it flake, and returns a
verdict that can be `delete`.

```
A TEST THAT CANNOT FAIL IS A LIABILITY; NO VERDICT WITHOUT THE WRONG IMPLEMENTATION IT REJECTS.
```

## When to use / when not to use

Use when:

- the user says "are these tests any good?", "does this test actually check anything?", "the tests pass
  but nobody trusts them", "90% coverage and bugs still ship", "review the tests in this PR"
- the user says "is this snapshot worth it?", "should I mock this?", "unit test or integration test?",
  "flaky", "passes locally, fails in CI", "passes alone, fails in the suite", "we retry it three times"
- a test broke on a refactor that changed no behaviour, or a bug shipped through a green suite
- a test is about to be skipped, retried, quarantined, or deleted to make the build green, or it asserts
  a security hole or "current behaviour" nobody decided is correct

Not when:

- the test does not exist yet and the job is to write it before the change — that is `red-green`
- the question is whether a run was green, or what its output says — that is `prove-it`
- the claim is about the cause of a failure, not the test's quality — that is `weigh-evidence`
- the diff is a schema or migration and the question is its shape or safety — that is `judge-data`
- the tests are hard to write because the module has no seam — that is `judge-architecture`
- the test certifies a cross-tenant read or an injection — `judge-risk` prices it; this lens deletes it
- the deliverable is the review comment or handoff — `report-with-evidence` or `write-handoff`
- the question is whether to keep investing in the suite versus ship — that is `make-the-call`

| if the situation is | use |
|---|---|
| "are these tests any good?" | this skill |
| "write the failing test before the fix" | `red-green` |
| "is the suite green?" | `prove-it` |
| "why does this fail only in CI?" | this skill for the mechanism; `weigh-evidence` for a hypothesis about the code |
| "the endpoint is slow" | `judge-performance`; the suite's runtime is a budget here, not the product's latency |
| "this test locks in a security hole" | `judge-risk` to price it, then this skill to delete it |
| "should we drop the e2e suite to ship faster?" | this skill prices the coverage, `make-the-call` rules |

## The words this lens uses

Seven terms. The verdict uses these words; the avoided one on the right is where the judgement leaks
back into "it looks fine".

| term | means here | _avoid_ |
|---|---|---|
| **assertion strength** | the set of wrong implementations a test rejects, named one by one — not the number of assertions | "coverage", "thorough", "well tested" |
| **oracle** | where the expected value comes from, independent of the code under test | "expected value" (a slot, not a source), "golden file" (a source, not necessarily independent) |
| **mutation** | one plausible wrong implementation the test must reject: an inverted condition, an off-by-one, a dropped write, a swapped status | "edge case", "negative test" — both name inputs, not wrongness |
| **the shipped branch** | the path a real request, user, or job takes in production, including its error, empty, and retry cases | "happy path" (one branch), "critical path" (a priority claim) |
| **seam** | the boundary where a test replaces a real collaborator — time, randomness, network, database, third party | "mock point", "injection point" |
| **double** | a stand-in for a collaborator, by kind: stub (returns), spy (records), fake (works), mock (expects) | "mock" for all four — the generic word hides which one, and whether it is the SUT |
| **flake** | a result that depends on something other than the code under test: time, order, shared state, network, randomness, concurrency | "intermittent", "unstable" — symptoms that skip the mechanism |

## The rejection list — delete or block on sight

Every row is a finding, not a note. The third column is the only observable that clears it.

| rejected | why | what clears it |
|---|---|---|
| a test with no assertion, or only `not.toThrow()` / `assertTrue(true)` / an empty snapshot | it fails only on a crash; it certifies the code ran | an assertion that fails when the behaviour is wrong — a named mutation |
| an assertion on the double instead of the outcome: `expect(save).toHaveBeenCalled()` with the stored value unchecked | it passes when the code saves the wrong thing, and fails when a refactor inlines the call | the resulting state, or the call's arguments when the call *is* the contract |
| the unit under test is mocked — the class or module replaced, or its own method stubbed | the test exercises the double; the real code never runs | the real SUT, with collaborators faked at a seam |
| a test that passes with the production line deleted or the condition inverted | it cannot fail on the bug it claims to guard | a named mutation it kills |
| a change detector: exact log wording, private call counts, internal ordering, whole-object equality on a growing DTO, a page snapshot nobody reads | it fails on refactors and passes on bugs | a narrow, stable projection of the observable outcome |
| a fixed `sleep` used as synchronization | it encodes the machine's speed: green locally, red on a cold runner | poll the condition with a timeout, or await the signal |
| a skip, retry, or `|| true` that hides a failure: `it.skip`, an ownerless `xfail`, `retry: 3`, `continue-on-error` on the test job | the suite is green because the test did not run | the test runs and passes, or is deleted with a linked issue and an owner |
| a test that reaches production or a shared external service: a live key, a shared staging database, a real URL, an assertion against today's date | a monitor with side effects, failing for reasons unrelated to the diff | a fake or a contract test; a separate integration suite with its own environment |
| an oracle that recomputes the implementation: expected = the same formula, serializer, or function; a golden file generated by the code under test | a tautology that agrees with any bug | a spec literal, a hand-computed value, a property, or a golden file from an independent known-good run |
| a test that asserts the bug — the expected value is the current wrong output, or it certifies a security hole | it blocks the fix and makes the defect look intended | delete it, or invert it to the correct behaviour with the bug linked |
| a test that cannot run in the suite it ships in — needs a browser, a local service, a credential — but lives in the unit suite | it will be skipped, and a skipped test is a green that lies | move it to the level that can run it, or fake the dependency |

## The process

### Phase 0 — Scope the tests, and take the zero tier when no test is owed

List the tests added or changed by the diff, or the suite the user pointed at, at `file:line`. Then ask:
**does this change have observable behaviour?** A comment, a doc sentence, a formatting pass, or a
rename the compiler proves has none — no test is owed: `ship`, `Change: none`, and `Checked` names what
was examined.

The zero tier is otherwise earned: every test names a behaviour, kills a mutation, sits at the level
where the behaviour lives, and has its flake sources controlled — `ship`, claimed in Phase 6. Changed
behaviour with no test is `strengthen`, naming the behaviour, the level, and the mutation the missing
test must kill; writing it is `red-green`'s loop.

**Done when:** the scope is a list of tests at `file:line` (or `suite: <path>`), and either the verdict
is `ship` with its reason, or the question the rest of the process answers is written down.

### Phase 1 — Name the behaviour, and where the oracle comes from

For each test, write the sentence it protects: *given this state, when this happens, then that is
observed*. No sentence means a change detector or a test of the framework — `delete`.

Name the oracle from §2: a spec literal, a hand-computed value, a property, an independent reference
implementation, a golden file from a known-good run, or — last, a finding — the code under test. A
value recomputed from the implementation cannot disagree with it; the test is a tautology with a green
tick.

**Done when:** every test has a behaviour sentence and an oracle source, or is marked `no behaviour
named`.

### Phase 2 — Name the wrong implementation it kills

For each test, write one plausible wrong implementation it must reject, from §3: invert the condition,
move a boundary by one, drop the write, return the input, swap two branches, ignore the error, remove
the filter, return the default, reorder the side effects.

Then ask: **would this test fail?** No nameable wrong implementation means it cannot fail on a bug —
`delete`. A named mutation that survives means the assertion is too weak or the oracle is wrong —
`strengthen`, with the killing assertion written down. Mutation testing is this question at suite
scale; it is slow, so scope it.

**Done when:** every test has a named mutation it kills, or `Kills: nothing` with the assertion to add.

### Phase 3 — Check the level and the doubles

For each test, write what is real, what is faked, at which seam, and by which kind of double.

- The SUT is never faked; a test that stubs the class under test asserts the stub.
- A double replaces a collaborator at a seam the production code already has — I/O, time, randomness,
  network, a third party — not a call between two of your own functions.
- Prefer a fake to a mock when the collaborator has behaviour: an expectation is a change detector
  unless the interaction is the contract (email sent, payment charged, event published).
- The level is the lowest that can observe the behaviour — but a suite of unit tests with every
  collaborator faked proves the wiring nowhere. At least one test must run where the feature is wired.

**Done when:** every double is classified (stub, spy, fake, mock), every fake sits at a named seam, no
double stands in for the SUT, and one test runs at the level where the feature is wired.

### Phase 4 — Follow the branch that ships

Enumerate the branches that matter, from §8: the error path, the empty collection, the boundary (0, 1,
max, max + 1), the permission denial, the retry and timeout, the partial failure, the concurrent write,
the duplicate. For each, name the test and the mutation it kills.

Coverage is a floor, not a target. Quote branch coverage for the changed lines and files, not the
project total; a 100% line-covered error path with no assertion is untested. Mutation score moves with assertion strength.

**Done when:** every shipped branch is covered by a test with a named mutation or listed as untested
with its risk, and the coverage number is for the changed code.

### Phase 5 — Find the flake before it finds CI

Walk §6: clock and timezone, randomness, network, shared database or file or port or env var, test
order, concurrency, async waits, external services, locale, filesystem case, floating point. For each
source present, name the control: fake clock, seeded generator, per-test isolation, poll with timeout,
ephemeral port, deterministic scheduler.

A flaky test is worse than no test: it teaches everyone to re-run red. If it has already failed
intermittently, the mechanism is the finding — one green run after a retry does not close it.

**Done when:** every source is controlled or accepted with an owner and a quarantine date, no `sleep` is
the only synchronization, and no skip or retry hides a failure.

### Phase 6 — Emit one verdict and the artifact

One verdict per test; for a suite, one row per test with the same slots as columns, and the suite's
verdict is the highest tier in the table. Fill every slot:

```
Verdict:    ship | strengthen | re-scope | delete | redesign | reject
Tier:       <pass | conditional | fix | redesign | refuse — mapped in the table above>
Test:       <file:line, or suite: <path> — the scope of this verdict>
Behaviour:  <given … when … then … — or "none named" (a finding)>
Oracle:     <spec literal | hand-computed | property | independent reference | golden from a known-good run | the code under test (a finding)>
Kills:      <the wrong implementation this test rejects — one line — or "nothing">
Level:      <unit | contract | integration | e2e>; faked: <what, at which seam, by which kind of double>
Flake:      <source → control, or "none found">
Checked:    <what was examined and found clean — never empty on a ship>
Change:     <the one edit that moves it to ship — or "none: it earns its keep">
```

`Checked` makes `ship` a review rather than silence: the tests read, branches walked, the flake
sources looked for. `Change` makes every other verdict actionable; "add more tests" is not a change.

**Done when:** every test in scope appears in the artifact, the verdict is one of the six, and `Change`
is one executable edit or "none: it earns its keep".

## The verdict enum

| verdict | tier | means | use when |
|---|---|---|---|
| `ship` | `pass` | the tests earn their keep; no addition or edit is owed | every test names a behaviour, kills a mutation, sits at the right level, and has its flake sources controlled — `Checked` says so |
| `strengthen` | `fix` | right test, right level, asserts too little | a named mutation survives, the oracle recomputes the code, a shipped branch has no assertion, or changed behaviour has no test |
| `re-scope` | `redesign` | right assertion, wrong level or seam | the SUT is faked, a pure function is tested end-to-end, a double sits between two of your own functions, or the wiring is tested nowhere real |
| `delete` | `fix` | the test protects nothing, or fails only on refactors | no mutation it kills, a change detector, duplicate coverage, a test of the framework |
| `redesign` | `redesign` | the harness makes good tests impossible | shared mutable state, order dependence, sleep-based waits, a fixture that builds the world, no seam for time or network |
| `reject` | `refuse` | the test must not land | it asserts the bug or a security hole, reaches production, or hides a failure behind skip or retry |

`delete` and `reject` both remove a test; only `reject` blocks. `conditional` is unused here: a test protects something or it does not. `re-scope` moves one test to another
level or seam; `redesign` moves the fixture layer every test in the file depends on. `ship` is the zero
tier — "these tests earn their keep — no additions" — and a lens that ran and found nothing emits `ship`
with `Checked` filled, never silence.

## Gotchas

- `pytest.raises` / `assertRaises` passes when the block raises for the wrong reason — a typo, a missing
  fixture, a `KeyError` in setup. Assert the type, the message, and that the code reached the raise.
- Coverage counts a line executed by a test with no assertion. 100% line coverage with
  `expect(x).toBeDefined()` on every line cannot fail; branch coverage and mutation score are the
  numbers that move with assertion strength.
- A snapshot is born an oracle and becomes a change detector: the first is read, the next forty are
  approved with `-u` unopened. A snapshot of a whole page fails on every refactor and on no bug.
- A test that passes alone and fails in the suite is usually shared state, not a flaky SUT: a
  module-level database, a singleton, a fixed port, a reused temp dir, an env var, a fake clock left
  installed. Shuffle the order and run in parallel to separate order from contention.
- `sleep(2)` is a bet on the machine: green on the laptop, red on the cold runner. Poll the condition
  with a timeout — still a bet, but it names the condition and fails with the state in hand.
- A retry turns a 1-in-50 failure into a 1-in-125,000 report only if runs are independent, and they are
  not: the shared state persists. The diagnosis moves from "a race" to "fine now", and the race stays.
- `expect(fn).toHaveBeenCalledTimes(1)` fails when a refactor batches two calls into one with identical
  behaviour, and passes when the call carries the wrong argument. Interaction assertions are change
  detectors unless the interaction is the contract.
- A test database built from models rather than migrations passes while the migration is broken; the
  schema proved is not the schema production runs. Run the migrations in setup, or test the migration.
- `-x` / `--bail` and parallel workers change which tests run together: green serially can be red under
  `-n auto`, and the reverse. The green you ship is the one CI runs, with CI's flags.
- A test calling `now()` fails at midnight, a DST transition, month end, or February 29, and looks
  random. Freeze the clock at the boundary; the boundary is where the bug lives.

## Rationalizations

| Excuse | Reality |
|---|---|
| "The tests pass, so the behaviour is covered" | Green means the assertions held. If they cannot fail, it means the code ran. |
| "Coverage is 90%, the suite is good" | Coverage counts execution, not verification. Name the shipped branch and the mutation each test kills. |
| "Mocking is standard practice" | Mocking the SUT is a way to test the double. Name what is faked and at which seam. |
| "It's flaky, just retry it" | The retry hides the mechanism and buys a green that depends on the budget. The flake is the finding. |
| "The snapshot changed, so I updated it" | Did you read the diff? An unread snapshot update is an unreviewed change. |
| "The test asserts the implementation because the implementation is the spec" | Then it is a change detector. Assert what the caller sees. |
| "The bug was in the test, not the code" | Then the oracle recomputed the bug or the test was a change detector. Fix the oracle, not the expectation. |
| "I'll add the assertion after it works" | A test without an assertion is a comment with a pass status; it will be green forever. |
| "The integration suite covers the wiring" | Then name the test that would fail if the wiring were wrong. If there is none, the unit test proves only that the unit calls its doubles. |
| "Different words, so the rule doesn't apply" | Spirit over letter. "Smoke test", "sanity check", "characterization test", and "contract test" are tests; the question is the same: what wrong implementation does it reject? |

## Red flags

- You are calling a suite good because it is green.
- You are quoting a coverage percentage and no mutation.
- You are reading test names instead of assertions.
- You are about to add `retry`, `skip`, or a longer `sleep`.
- You are updating a snapshot without reading its diff.
- You are mocking the class under test.
- You are writing "add more tests" without naming the branch and the assertion.
- You are treating a passing test as evidence the behaviour is right.

## Limitations

- Judges the tests in front of it; it cannot prove the suite is complete. Mutation testing floors the tests that exist; it does not cap the behaviours missing.
- Cannot see production traffic. "The shipped branch" is inferred from the code and its call sites; a
  path only a rare tenant takes is invisible without logs or traces.
- Coverage tools are not comparable across languages (line vs branch vs condition; Istanbul,
  coverage.py, JaCoCo). The reasoning transfers; the reference's numbers are per tool.
- Cannot fix a design with no seam. If the behaviour is tangled with its environment, the finding is
  "no seam" and the fix belongs to `judge-architecture`, not to the test.
- Cannot judge whether the asserted behaviour is the right behaviour. A test can be strong and assert
  the wrong thing; the oracle's source is the finding, and the spec is outside this lens.

## Reference

Read [references/test-values.md](references/test-values.md) before Phase 2, and take every threshold,
timeout, default, and ladder from it — never from memory.
