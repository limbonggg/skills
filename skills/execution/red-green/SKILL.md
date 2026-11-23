---
name: red-green
description: Use when about to change code that ships — "fix this bug", "add the feature", "implement X", "refactor this" — or the user says "TDD", "test first", "red-green"; also when the fix looks obvious, the repo has no test harness, or the plan is to add tests after. Not for a failure whose cause is still unknown (use debug-systematically), claiming it works (use prove-it), or deciding whether to build it (use make-the-call).
domain: execution
risk: writes
invocation: model
version: 0.1.0
metadata:
  form: discipline
  baseline: fix-edited-before-a-failing-test
  eval: evals/
---

# Red Green

The failing run comes before the diff. This skill makes that ordering non-negotiable, and names every
way out of it.

```
NO PRODUCTION CHANGE WITHOUT A FAILING TEST FIRST.
```

## When to use / when not to use

Use when:

- you are about to edit code that runs in production — a function, a query, a config that changes
  behaviour, a migration, a handler
- the user says "fix", "add", "implement", "change", "refactor", "port", or "hotfix" about something
  that ships
- the user says "TDD", "test first", "red-green", or "write the test first"
- the fix looks obvious — that is the condition under which the test is most often skipped
- the repo has no test harness, no test for this module, or no tests at all
- the plan is "get it working, then add tests"
- a test is red and the job is to make it green

Not when:

- you are diagnosing *why* something fails — that is `debug-systematically`; this skill governs the
  change, not the investigation
- you are about to claim something works — that is `prove-it`; this skill produces the evidence,
  `prove-it` governs the sentence
- the question is whether to build the thing at all — that is `make-the-call`
- you are slicing an epic into shippable pieces — that is `split-by-frontier`
- you are reviewing someone else's diff rather than changing code

Routing, where the boundary is not obvious:

| the situation | the skill |
|---|---|
| the change is decided and the code is about to move | this skill |
| the change is decided, but the cause of the bug is a guess | `weigh-evidence` first, then this skill |
| the change is written and the question is whether it works | `prove-it` |
| the change is not decided yet | `make-the-call` |

## The process

Four phases. The ordering is the skill; the contents of each phase are yours to choose.

### Phase 1 — Write the observation before the change

State the behaviour in one sentence: *given this input, the system does that*. Write the cheapest
executable observation of that sentence. A unit test, a contract test, a shell script that invokes the
CLI, a SQL fixture with an assertion — the form is free, the red is not.

Why before: a test written first is a claim about the world. A test written after is a description of
the code you just wrote, and a description of the code can only agree with it.

In a repo with no harness, the first test is a script that reproduces the report: the failing input,
the command, a non-zero exit. That is a test. "No framework" is a reason to write a smaller test,
never a reason to write none.

**Done when:** one command encodes the new behaviour and runs without editing.

### Phase 2 — Watch it fail, for the expected reason

Run the new test alone and read the failure. It must be the assertion you wrote — expected value
against actual — not a collection error, an import error, a fixture returning `None`, or a typo in the
test.

A red for the wrong reason is not evidence. It proves the test runs, not that it can detect the
absence of the behaviour, and the failure message is the only place that difference is visible.

If it passes: either the behaviour already exists (you are not making the change you thought) or the
test cannot fail (it will never protect anything). Fix the test, not the expectation.

If the test is a characterization test — written to pin down what untested code does today — it passes
by construction. Prove it can detect change by breaking the code deliberately (invert a condition,
change a constant), watching the test go red, and reverting. For a fix that is already written there
is a cheaper route: stash the production change, run the test, restore.

**Done when:** the failure output names the behaviour under test, and you can say in one sentence why
the code cannot pass it today.

### Phase 3 — Make it pass with the least code

Write the smallest change that turns that one test green — not the design you want, the design that
satisfies the test and no more. The next test is what pulls the design out; that is the point of the
ordering.

Run the new test, then the suite. A green new test with a red suite is not green.

**Done when:** the Phase 1 command passes and no previously passing test fails, both observed in this
turn.

### Phase 4 — Refactor under the green bar

Now improve the shape: extract, rename, deduplicate, move the seam. Re-run the same command after each
structural move. A refactor that is not followed by a green run is a rewrite with a better name.

**Done when:** the suite is green after the last edit, and the diff contains no behavioural change that
was not first seen red.

### The change that cannot be observed

Some changes have no observable behaviour: a comment, a doc sentence, a license header, a dependency
bump with no API change. The predicate is not "is this important" or "is this hard to test" — it is
**can any command distinguish before from after?**

If yes, that command is the test: a compiler, a type checker, a schema diff, a `--dry-run`, a grep over
the diff for the old symbol. A rename is testable — the build fails on every caller still using the old
name. If no, say so in the turn — "no observable behaviour change; the gate is the diff" — and keep the
diff inside the non-observable lines.

**The skill is done when** the session contains a failing run of the new test before the first
production line changed, and a passing run after the last one — the outputs, not a summary of them.

## Gotchas

- A test written after the change passes on its first run, and a first-run pass looks identical to a
  test that cannot fail. The red run is the only evidence the test has teeth.
- The commonest false red is a test that cannot run at all: `ModuleNotFoundError`, a wrong fixture
  path, `0 tests collected` with a non-zero exit. It looks red and proves nothing. Read the failure;
  if it does not name your assertion, it is not red.
- Characterization tests pass by construction. Without the deliberate break, a characterization test is
  a comment with a pass status, and it will not catch the refactor it was written to protect.
- Mocks fail on the mock. A stub returning the old shape makes a new test fail with a shape error,
  which reads as red. Keep the fake current, or assert at the real boundary.
- A suite can be green with the new test excluded: a `-k` filter, `.only` on another test, a skip
  marker, a cached run, a compiled artefact in `dist/`. Confirm the new test's name appears in the
  output before you believe the colour.
- A test that asserts a mock was called, or asserts nothing, is green for the call, not for the
  behaviour.
- Shared state — a database row, a port, a temp dir, an env var — can make a test red alone and green
  in the suite, or the reverse. The red has to hold in the suite you will ship against.
- For a fix already written, stashing the production change and running the test gives the same
  evidence as writing the test first, for one command. Restore, then re-run to see green.

## Rationalizations

| Excuse | Reality |
|---|---|
| "The fix is obvious" | Obvious fixes are the ones nobody tests and the ones that come back. The test is one command; the bug report cost a human. |
| "There's no test harness here" | Then the first test is a script that reproduces the report — a command that fails now and passes after. No harness means a smaller test, not none. |
| "I'll add the test after" | After is the one ordering the law forbids. A test written after passes on its first run, so it never demonstrated it can fail. |
| "The code is already written; deleting it is wasteful" | The cost is sunk either way. Keep the design, delete the lines, write the test, retype them. Keeping it "as reference" is how it reaches the diff. |
| "It's a one-line change" | One-line changes are what breaks the build. The test for a one-line change is one line. |
| "I'm only refactoring" | Then the tests are green before and after. If there are none, the first work is characterization — and the red is a deliberate break you watch the test catch. |
| "The test is hard to write" | That is design feedback, not an exemption. Hard to test usually means the behaviour is tangled with its environment; the test is telling you where the seam goes. |
| "I verified it manually" | A manual check leaves no red output, does not run again for the next person, and does not run in CI. It is an observation without a witness. |
| "The user is in a hurry" | A second round trip costs more than the test. The hurry is the argument for getting it right once. |
| "This is a spike" | Fine — then it does not ship, and the diff says so. A prototype that gets promoted is the change nobody tested. |
| "The test passed, so it works" | A first pass is not evidence until the test has been seen to fail. `prove-it` governs the claim; this skill governs the ordering. |
| "Different words, so the rule doesn't apply" | Spirit over letter. "I'll verify it manually", "the integration test covers it", and "the type checker is the test" are the same sentence in different words — each still needs a red run that names the behaviour. |

## Red flags

- You are typing the fix and the test does not exist.
- You are about to run the new test for the first time after the change.
- The test passed on its first run and you are moving on.
- The red you saw was an import error, a collection error, or a typo.
- You are writing the assertion to match what the code returns.
- You are editing the test so that it passes.
- You are explaining why this change cannot be tested.
- You are keeping the old implementation "as reference" while you write the test.

## Limitations

- Cannot make a test good. A loop over an assertion that recomputes the implementation produces
  confidence in a tautology; the expected value has to come from outside the code under test.
- Cannot observe what the harness cannot reach: rendered output, third-party side effects, timing
  under load. The closest red is a contract test on the boundary, and it does not prove the pixels.
- Costs a real cycle per change. A throwaway spike is handled by labelling it, not by faking the loop;
  this skill has no cheap mode.
- Does not decide what to test or how much. That is the spec and `make-the-call`; this skill only fixes
  the order of the work.
- Assumes a command can be run. Where the environment cannot run tests at all — no toolchain, no
  network, no service — the honest state is "no failing test observed" and the change waits.
