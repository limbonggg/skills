# Behaviour eval — red-green

Each case records the **baseline** (what a competent model does without the skill), the **required**
behaviour with it, and the **observable** that distinguishes them.

The baselines below are **written hypotheses, not yet captured from a live run** — they describe the
failure we expect, quoted in the form it usually takes. Replace each with the observed no-skill
transcript the first time a real baseline run happens. Every case is run twice, with and without the
skill; the without-arm is the control that makes the wording claim testable. A case whose two arms
look the same is a case the skill does not earn.

### 1. The obvious fix

**Setup.** A bug report says the parser crashes on an empty file. The model has read the parser, found
the unguarded `lines[0]`, and the fix is one line.

**Baseline (hypothesis — unverified).** The model edits the line and replies "Fixed — the parser now
handles empty input." No test is written and no command is run.

**Required.** A test that parses an empty file is written and run first; it fails with the reported
crash (an `IndexError` at the reported line); the guard is added; the test and the suite pass. If the
repo has no harness, a script that invokes the parser on an empty file and exits non-zero is the test.

**Observable.** A failing run whose message names the reported crash appears in the transcript *before*
the production diff, and a passing run of the same command appears after it.

### 2. The missing harness

**Setup.** A repository with no test framework, no test directory, and no CI. The user asks for a
validation branch on an upload handler.

**Baseline (hypothesis — unverified).** The model says "there's no test setup here, so I'll make the
change and you can verify it manually", edits the handler, and reports success.

**Required.** The model writes the smallest executable reproduction — a script that calls the handler
with the failing input and asserts the exit status — runs it, watches it fail for the reason under
test, then changes the handler and re-runs. The absence of a framework changes the size of the test,
not the order of the work.

**Observable.** A new runnable file or command exists, its failing output is in the transcript before
the handler diff, and the reply cites both runs rather than a manual check.

### 3. The test written afterwards

**Setup.** The model has already written the implementation in this session. It now adds a test for
the new behaviour, and the test passes on the first run.

**Baseline (hypothesis — unverified).** The model reports "added a test, it passes" and treats the pass
as confirmation that both the code and the test are right.

**Required.** A first pass is not evidence. The model proves the test can fail: stash or revert the
implementation (or break it deliberately), run the test, watch the red, restore, re-run to green. If
the test still passes against the old code, it is testing nothing and gets rewritten.

**Observable.** The transcript contains a red run of that specific test, produced after the test was
written and before any claim of green.

### 4. The wrong red

**Setup.** A new test is added for a new method. It fails — with `ModuleNotFoundError`, because the
test imports the class from a path that does not exist yet.

**Baseline (hypothesis — unverified).** The model reads "the test fails" as RED and starts implementing
the method.

**Required.** A failure that does not name the behaviour is not RED. The model fixes the import until
the failure is the assertion — the missing method or the wrong value — and only then implements.

**Observable.** The accepted failing output names the assertion or the missing symbol, not an import,
collection, or fixture error; the implementation edit comes after that output.

### 5. The refactor of untested code

**Setup.** A 200-line function with no tests must be split into three. The user says "behaviour must
not change".

**Baseline (hypothesis — unverified).** The model extracts the three functions, reads the result, and
reports "pure refactor, no behaviour change" without running anything.

**Required.** Characterization tests come first and pass against current behaviour. Because they pass
by construction, the model proves they have teeth: break one condition deliberately, watch the test go
red, revert to green. Then the split happens, with the same command re-run after each structural move.

**Observable.** The transcript shows green → deliberate red → green *before* the first extraction, and
a green run after the final one.
