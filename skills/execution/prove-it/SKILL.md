---
name: prove-it
description: Use when about to say something works — "done", "fixed", "passes", "tests are green", "deployed", "should be fine" — or when a previous claim needs checking before someone acts on it. Not for deciding whether the work is worth doing (use make-the-call).
domain: execution
risk: reads
invocation: model
version: 0.1.0
metadata:
  form: discipline
  baseline: claim-asserted-without-a-run
  eval: evals/
# pack membership is declared in packs/*.yml, not here — one skill lives in many packs
---

# Prove It

A claim about software is a statement about an observation. This skill makes the observation happen
before the sentence does.

```
NO COMPLETION CLAIM WITHOUT A COMMAND RUN IN THIS TURN.
```

## When to use / when not to use

Use when:

- you are about to write "done", "fixed", "works", "passes", "green", "deployed", "migrated", or
  "should be fine"
- the user says "does it work?", "are you sure?", "did you test it?", "is it deployed?", or asks for a
  status
- a previous turn made a claim and nobody has verified it since
- a subagent or worker reported success and you are about to relay it
- you are summarizing work for a handoff, a PR description, or a release note

Not when:

- the work is not finished and you are reporting progress — say what is done and what is not, and use
  `report-with-evidence` for the shape
- the claim is a design opinion rather than a behavioural fact — that is `make-the-call`
- you are diagnosing *why* something fails — that is `weigh-evidence`; this skill only governs the
  claim, not the investigation

## The process

Four steps. The first one is the whole skill; the rest exist so it cannot be skipped halfway.

### Step 1 — Name the command that would prove the claim

Write the claim as a sentence, then write the exact command whose output would make it true. If no
command exists, the claim is not verifiable in this turn and must be reworded into one that is.

| claim | the command that proves it |
|---|---|
| "the tests pass" | the full suite, not one file — `npm test`, and read the summary line |
| "the build works" | the build, from clean, with the exit code captured |
| "the bug is fixed" | the reproduction from the report, run again, showing the old failure is gone |
| "it is deployed" | a request against the deployed surface, showing the new behaviour |
| "the migration ran" | a query against the schema, not the migration's own log |
| "the type error is gone" | the type checker, whole project |

**Done when:** you have written a command whose output distinguishes the claim being true from being
false. A command that would pass either way is not a proof.

### Step 2 — Run it, in this turn

Run the command now. Not earlier in the session, not in a previous turn, not "we ran this before the
last edit". The last edit is the reason the old run does not count.

Capture the exit code and the full output. If the command is expensive, run the narrowest version that
still distinguishes true from false, and say which version you ran.

**Done when:** you have output in front of you, produced after the most recent change.

### Step 3 — Read the output, not the exit code

Exit code zero is a claim by the tool, not by the world. Read the summary line, count the failures,
look for the word "skipped", look for a warning that the suite did not run.

The failure modes, in order of how often they fool people:

- **The suite did not run.** `0 tests`, a config error, a missing dependency — all exit 0 or 1 with a
  message that is not a test result.
- **The suite ran partially.** `-x`, a filter, a shard, a file argument. A green run of one file is a
  claim about one file.
- **The tests ran but skipped.** `12 passed, 3 skipped` is not "12 tests pass" if the 3 are the ones
  that matter.
- **The output was truncated.** You read the head or the tail of a 4,000-line log. Read the summary.
- **The command succeeded at something else.** `docker build` succeeding says the image built, not that
  the app starts.

**Done when:** you can state, in one sentence, what the output shows and what it does not.

### Step 4 — Make the claim at the strength the evidence supports

Three registers, and the register is part of the claim:

- **Verified:** the command ran, the output shows it. State it plainly, and name the command.
- **Partially verified:** the command ran and covers part of the claim. State the part that is covered
  and the part that is not. "Unit tests pass; the integration suite was not run."
- **Unverified:** no command was run. Say so, in those words, and say what would verify it.

The sentence is the deliverable. A claim stronger than its evidence is a defect even when the code is
correct.

**Done when:** the claim's register matches what Step 3 established, and no word in the sentence is
stronger than the output.

## Gotchas

- A subagent's `Status: DONE` is a report, not an observation. It ran in a different context and may
  have claimed completion after asking a question and exiting cleanly — the exit code is 0 in both
  cases. Re-run the command yourself before relaying it.
- `&&` chains hide the failing step's output. `npm test && npm run build` tells you the build ran, not
  that the tests were clean, if the test output scrolled past.
- Watch mode and interactive runners exit 0 on interrupt. `vitest --watch` interrupted with Ctrl-C is
  not a passing run; use `vitest run`.
- A test that passes immediately after being written has proven nothing yet — it has not been seen to
  fail. That is `red-green`'s gate, and this skill cannot substitute for it.
- Formatters and linters often exit 0 after *fixing* the problem. `eslint --fix` exiting 0 means it
  rewrote files, not that they were already correct.
- `git status` clean is not "committed". A staged change and a committed change look the same to a
  summary.
- Cached test runners will report a green suite without running anything when inputs are unchanged.
  If the input did not change, the green is about the last change, not this one.

## Rationalizations

| Excuse | Reality |
|---|---|
| "Should work now" | "Should" is the word for a claim you did not test. Run it. |
| "I'm confident" | Confidence is not evidence. The command takes thirty seconds. |
| "It passed before my last edit" | Your last edit is exactly what the old run does not cover. |
| "The change is trivial" | Trivial changes are the ones that break the build. That is why it is cheap to check. |
| "I already manually tested it" | Manual testing is a valid observation only if you can say what you ran and what you saw. If you can, that is the evidence — cite it. If you cannot, run it. |
| "Partial check is enough" | A partial check proves a partial claim. Say which part. |
| "The tests are slow" | Run the narrowest suite that distinguishes true from false, and say which one you ran. |
| "It's just a summary, not a claim" | A summary is a series of claims. Every sentence about state is one. |
| "Different words, so the rule doesn't apply" | Spirit over letter. "Looks good", "ready to go", and "all set" are completion claims. |

## Red flags

- You are about to type "done" and you have not run a command in this turn.
- You are describing what the code *should* do as though you had watched it do that.
- You are relaying a worker's success without a command of your own.
- You are reading the diff instead of the output, and calling that verification.
- You are reasoning about why it would work rather than observing that it does.
- You are softening the claim ("probably", "seems to") instead of running the check.

## Limitations

- Covers behavioural claims only. "This design is right" and "this is the better trade-off" are not
  verifiable by a command; they are `make-the-call`.
- Cannot verify anything that requires a credential, a paid service, or a production environment you
  cannot reach. In those cases the honest output is "unverified, and here is what would verify it" —
  never a claim.
- A passing check is evidence about the check, not about the system. Coverage of the claim depends on
  whether the command actually exercises it; this skill forces you to read the output, but it cannot
  make a weak test strong.
