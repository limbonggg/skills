# Test values — the numbers this lens judges against

Every value here is a floor, a default, or a measured base rate, never a target to hit for its own
sake. Where a tool ships a default, the default is quoted so "we left it at zero" is visible as a
choice. Where a number comes from a published study, the source is named and the consult date is in
`## Sources`. Numbers without a source are marked **heuristic** and are the lens's judgement, not
evidence.

## Table of contents

1. Assertion strength
2. The oracle ladder
3. Mutation operators, thresholds, and scoping
4. Doubles and the level ladder
5. Coverage
6. Flake sources and their controls
7. Suite budgets and timeouts
8. The shipped-branch list
9. Zero-tier triggers

## 1. Assertion strength

Strength is the set of wrong implementations a test rejects. Assertion count is a weak proxy: one
assertion on the returned row can be stronger than ten on private calls.

| signal | reading |
|---|---|
| the test still passes with the production line deleted | no assertion on that line's effect; the test certifies execution |
| the test passes with the condition inverted | the assertion does not depend on the branch |
| the only assertion is `not.toThrow()` / `toBeDefined()` / `toBeTruthy()` / `assertTrue(true)` | no oracle; the test fails only on a crash |
| the assertion is on the double (`toHaveBeenCalled`) and not the outcome | the double is the subject; the real effect is unchecked |
| the assertion is on exact log text, call counts, or internal ordering | change detector; fails on refactors, passes on bugs |
| status asserted, body not (or the reverse) | half an oracle; a 200 with an empty body passes, a 500 with the right error passes |
| the expected value is recomputed from the code under test | tautology; agrees with every bug |

Minimum for a test to count: at least one assertion on an observable outcome — a return value, a
persisted row, an emitted event, a response status *and* body, or a state transition. An assertion
that survives deleting the code is not an assertion.

## 2. The oracle ladder

Strongest first. The source of the expected value decides what the test can catch; the position on
this ladder is the finding, not the assertion's syntax.

| # | oracle | independent of the code? | catches | misses |
|---|---|---|---|---|
| 1 | spec literal or worked example from the requirement | yes | wrong values, wrong branches | cases the spec forgot |
| 2 | hand-computed expected value | yes, but human | arithmetic and boundary errors | a shared misunderstanding of the spec |
| 3 | property or invariant (round-trip, idempotence, ordering, conservation) | yes | whole classes of wrong implementations | violations the property does not express |
| 4 | independent reference implementation (a second library, a known-good version, a model) | mostly | divergence from a trusted implementation | a bug both share |
| 5 | golden file captured from a reviewed known-good run | at capture time | regressions from that snapshot | anything the snapshot never exercised |
| 6 | recorded production trace or fixture | at capture time | divergence from real traffic | paths the trace never hit |
| 7 | the code under test (expected = the same formula, serializer, or function) | no | nothing | everything — this is a finding, not an oracle |

A golden file is an oracle only while someone reads its diff. Once `-u` is routine it is a change
detector (see §1's change-detector row).

## 3. Mutation operators, thresholds, and scoping

An operator is a mechanical edit that produces a plausible wrong implementation. The test suite
should kill it — fail — and a surviving mutant is a named gap.

| operator family | example edit | the bug it models |
|---|---|---|
| conditional boundary | `>=` → `>`, `<` → `<=` | off-by-one at the edge |
| negate conditional | `if (ok)` → `if (!ok)` | inverted branch |
| arithmetic | `+` → `-`, `*` → `/` | wrong calculation |
| return value | `return row` → `return null` / `0` / `""` / the input | missing or defaulted result |
| remove void call | delete the `save`, `emit`, `log`, or `invalidate` | dropped side effect |
| swap branches | swap the two arms of an `if`/`switch` | wrong case handled |
| error handling | delete the `catch` body, return a default on error | swallowed failure |
| literal change | `"active"` → `""`, `true` → `false` | wrong constant or flag |
| null removal | drop `?.` / the null check | crash on the empty case |
| filter removal | drop the `WHERE`/`filter`/`if` guard | leaked rows or unauthorized data |
| increment/decrement | `i++` → `i--`, `+1` → `-1` | wrong counter or pagination |

Thresholds and defaults:

| tool | setting | value | source |
|---|---|---|---|
| StrykerJS | `thresholds.high` / `low` | 80 / 60 (score colours; not a gate) | StrykerJS configuration docs |
| StrykerJS | `thresholds.break` | `null` — no build failure by default | StrykerJS configuration docs |
| PIT (pitest-maven) | `mutationThreshold` | 0 — build fails only below 0, i.e. never | PIT quickstart / `PitMojo` |
| PIT (pitest-maven) | `maxSurviving` | -1 — no limit by default | PIT quickstart / `PitMojo` |
| PIT (pitest-maven) | `testStrengthThreshold` | 0 — no gate by default | PIT quickstart / `PitMojo` |

Read the defaults as "mutation testing is off unless you configure it". A suite with no gate has no
mutation score that matters.

Two scores, not one:

- **mutation score** = killed / all mutants. Low when code is uncovered.
- **test strength** = killed / covered mutants. Low when code is covered but not asserted. Test
  strength is the assertion-strength number; mutation score also moves with coverage.

Scoping, because the cost is linear in suite runtime:

- cost ≈ suite runtime × mutant count. A 10-minute suite against 200 mutants is ~33 hours serial.
- mutate only the files the diff touched, or only files under the module being changed;
- use incremental mode (`--incremental` in Stryker, `withHistory` in PIT) so unchanged mutants are
  not re-run;
- nightly or weekly for the full run, never a pre-commit hook;
- equivalent mutants (behaviour-identical edits) are undecidable in general; record them with a
  reason and exclude them, do not chase 100%.

## 4. Doubles and the level ladder

| kind | what it does | asserts on calls? | use when |
|---|---|---|---|
| stub | returns a canned value | no | the collaborator's result is an input to the SUT |
| spy | records calls, real behaviour optional | yes, after the fact | the interaction is part of the contract |
| fake | working lightweight implementation (in-memory repo, fake clock) | no | the collaborator has behaviour the SUT depends on |
| mock | pre-programmed expectations, fails on unexpected calls | yes, up front | the interaction *is* the contract (email sent, payment charged, event published) |

Rules:

- the SUT is never a double; a stubbed SUT asserts the stub;
- a double sits at a seam the production code already owns — clock, randomness, network, database,
  queue, third party — not between two of your own functions;
- a fake must be contract-tested against the real implementation, or it drifts and the suite proves
  the fake;
- a mock's expectation is a change detector unless the interaction is the contract;
- the more of the collaborator graph is doubled, the less the test says about the wiring.

Level ladder, lowest first:

| level | real | proves | cost |
|---|---|---|---|
| unit | one unit, collaborators doubled | logic, branches, boundaries | milliseconds; nothing about wiring |
| contract | one boundary (HTTP handler, repository, queue consumer) | the boundary's shape and errors | tens of ms; the unit's integration with the boundary |
| integration | several real components, I/O faked or containerized | the wiring, transactions, serialization | seconds; environment-sensitive |
| e2e | the deployed system, real browser or client | the user-visible journey | minutes; flakiest, least diagnostic |

The level is the lowest that can observe the behaviour — with one exception: at least one test must
run where the feature is wired. A unit suite with every collaborator faked proves the wiring nowhere.

## 5. Coverage

| coverage | reading | source |
|---|---|---|
| 60% | acceptable | Google testing guidance |
| 75% | commendable | Google testing guidance |
| 90% | exemplary | Google testing guidance |

Google's own caveat: there is no universal target, and per-commit goals matter more than project
totals. A project at 90% can regress in the diff that ships.

| kind | counts | blind to |
|---|---|---|
| line / statement | a line executed | an assertion-free test; a branch never taken on that line |
| branch | each arm of each decision | conditions inside a compound boolean (unless condition coverage) |
| condition / MC-DC | each boolean sub-expression | data-flow errors between branches |
| function | the function called | everything inside |

Rules:

- quote coverage for the changed lines and files, not the project total;
- coverage is necessary, not sufficient: it says the code ran, not that a wrong result would fail;
- mutation score is the number that moves with assertion strength (§3);
- tools are not comparable across languages — Istanbul (JS), coverage.py (Python), JaCoCo (JVM),
  llvm-cov (C/C++/Swift/Rust) count different things; the reference's numbers are per tool.

## 6. Flake sources and their controls

A flake is a result that depends on something other than the code under test. Find the source, name
the control, or quarantine with an owner and a date.

| source | typical symptom | control |
|---|---|---|
| wall clock, timezone, DST | fails at midnight, month end, Feb 29, or on a CI box in UTC | freeze/inject the clock; assert the boundary explicitly |
| unseeded randomness | passes on rerun; different failures each time | seed the generator; print the seed on failure |
| network / external service | timeouts, 5xx from a third party, DNS | fake or contract-test it; block network in the unit suite |
| shared database or file | passes alone, fails in the suite; order-dependent | per-test transaction, schema, or temp database; no module-level state |
| fixed port | "address already in use" under parallel workers | port 0 / ephemeral port, discovered at runtime |
| shared env var or global singleton | leaks between tests, worse with `-n auto` | per-test setup/teardown; inject config |
| test order | green shuffled, red sorted | randomize order in CI; forbid inter-test dependencies |
| concurrency / async | intermittent timeout; passes with `--runInBand` | await the signal, poll the condition, deterministic scheduler |
| `sleep` as synchronization | green on a fast laptop, red on a cold runner | poll the condition with a timeout |
| floating point | last-digit mismatches | epsilon or exact decimal arithmetic |
| locale / filesystem case | fails only on some machines | pin locale; test case-sensitivity explicitly |
| resource contention in CI | passes on a dev box, times out on a loaded runner | reduce parallelism or the suite's footprint; retry is not a control |

Measured base rates (Google, 2016–2017):

| measure | value |
|---|---|
| test runs that are flaky | ~1.5% |
| tests that show flakiness | ~16% of ~4.2M tests |
| pass→fail transitions that are flakes | ~84% |
| CI compute spent re-running | 2–16% |

Consequence: a red build is more likely a flake than a regression, which is exactly why "just retry"
is corrosive — it trains the team to ignore the majority signal. A retry multiplies the failure rate
only if runs are independent; shared state makes them correlated, so the flake survives and the
diagnosis is lost.

Quarantine policy: an owner, a linked issue, and a date; the test is skipped with the reason in the
skip annotation, not silently. **Heuristic:** 30 days, then fix or delete.

## 7. Suite budgets and timeouts

Defaults, quoted so an override is a decision:

| tool | setting | default | source |
|---|---|---|---|
| Playwright | per-test `timeout` | 30,000 ms | Playwright timeouts docs |
| Playwright | `expect` timeout | 5,000 ms | Playwright timeouts docs |
| Hypothesis | `max_examples` | 100 | Hypothesis settings docs |
| Hypothesis | `deadline` | 200 ms per example | Hypothesis settings docs |
| Hypothesis | `stateful_step_count` | 50 | Hypothesis settings docs |
| Hypothesis `ci` profile | `derandomize` / `deadline` | `True` / `None` | Hypothesis settings docs |
| fast-check | `numRuns` | 100 | fast-check parameters docs |
| fast-check | `seed` | `Date.now()` — not reproducible by default | fast-check parameters docs |

Budgets, not defaults — **heuristic**, tune to the repo:

- the edit–test loop: a single unit test under 100 ms, the unit suite under 60 s locally;
- pre-merge CI: under 10 minutes for the suite that gates the merge;
- any test over 1 s belongs at contract level or above, and is named in the suite's budget.

A suite that exceeds its budget gets slower tests moved up a level, not a longer timeout. Raising a
timeout converts a slow test into a flaky one.

## 8. The shipped-branch list

Walk this list for the changed code. Each row is a branch a real request, user, or job takes; the
middle column is the wrong implementation that branch usually hides.

| branch | mutation it hides | the assertion that catches it |
|---|---|---|
| success path | wrong return value, dropped write | the returned row and the persisted state |
| empty collection / zero rows | crash on empty, or a default row invented | an empty result, not an error |
| boundary 0, 1, max, max + 1 | off-by-one, overflow, empty-vs-one | the value at each side of the edge |
| invalid input | validation skipped, wrong error | status, error code, and that nothing was written |
| permission denied | missing authz check, leaked field | 403/404, and the row unchanged |
| not found | null dereference, default object | the not-found response, not a 500 |
| conflict / duplicate | upsert where insert was meant | the conflict response and the single row |
| retry and timeout | retry on a non-idempotent call, no timeout | call count, final state, deadline honoured |
| partial failure (batch) | whole batch rolled back or half committed | per-item results and the committed subset |
| concurrent write / lost update | read-modify-write race | the final value under interleaving, or a version check |
| idempotency replay | duplicate side effect | one effect after two identical requests |
| error path with no state change | write before validation | the state after the failure |
| rollback | partial commit | no rows after the failure |
| pagination / large input | dropped page, off-by-one in the cursor | first, last, and empty page |
| unicode / null / empty string | truncation, encoding, null deref | the round-tripped value |

Not every row applies to every change. A branch that applies and has no test is a `strengthen`
finding naming the branch and the mutation.

## 9. Zero-tier triggers

The zero tier is a verdict, not a shrug. Two forms:

- **no test owed:** the change has no observable behaviour — a comment, a doc sentence, a formatting
  pass, a rename the compiler proves. `ship`, `Change: none`, `Checked` names what was examined.
- **tests earn their keep:** every test names a behaviour, kills a mutation, sits at the level where
  the behaviour lives, and has its flake sources controlled. `ship`, `Checked` lists the checks.
- **delete this test:** the test protects nothing — no mutation it kills, a change detector, a test
  of the framework, duplicate coverage. `delete`, with the mutation that survives named.

A lens that ran and found nothing must still emit the verdict with `Checked` filled. Silence is not
`pass`; a bare "LGTM" is the failure mode this slot exists to prevent.

## Sources

- Google, "Code Coverage Best Practices" (2020): 60/75/90 and the no-universal-target caveat —
  https://testing.googleblog.com/2020/08/code-coverage-best-practices.html
- StrykerJS configuration, `thresholds.high` 80, `low` 60, `break` null —
  https://stryker-mutator.io/docs/stryker-js/configuration/
- PIT quickstart (Maven), `mutationThreshold` 0, `maxSurviving` -1, `testStrengthThreshold` 0 —
  https://pitest.org/quickstart/maven/ ; defaults in `PitMojo` —
  https://github.com/hcoles/pitest/blob/master/pitest-maven/src/main/java/org/pitest/maven/PitMojo.java
- Google, "Flaky Tests at Google and How We Mitigate Them" (2016) — 1.5% of runs, 16% of tests, 84%
  of pass→fail transitions — https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html
- Google, "Where do our flaky tests come from?" (2017) — 2–16% of CI compute on re-runs —
  https://testing.googleblog.com/2017/04/where-do-our-flaky-tests-come-from.html
- Hypothesis settings — `max_examples` 100, `deadline` 200 ms, `stateful_step_count` 50, `ci`
  profile — https://hypothesis.readthedocs.io/en/latest/settings.html
- fast-check parameters — `numRuns` 100, default seed `Date.now()` —
  https://fast-check.dev/docs/api/interfaces/Parameters/
- Playwright timeouts — test 30,000 ms, expect 5,000 ms — https://playwright.dev/docs/test-timeouts

Consulted 2026-11. Defaults change between major versions; re-check the tool's own docs before
citing a number in a review.
