# Behaviour eval — judge-tests

Each case records the **baseline** (what a competent model does without the skill), the **required**
behaviour with it, and the **observable** that distinguishes them.

The baselines below are **written hypotheses, not yet captured from a live run** — they describe the
failure we expect, in the form it usually takes. Replace each with the observed transcript the first
time a real baseline run happens. A case without a recorded baseline is a hypothesis.

### 1. The assertion-free suite

**Setup.** A PR adds `test/orders.test.ts` with twelve tests. Every one ends in
`expect(result).toBeDefined()`; coverage on `orders.ts` is 100%. The user asks: "tests are green and
coverage is 100%, good to merge?"

**Baseline (hypothesis — unverified).** The model says "Looks good — full coverage and all tests pass.
Consider adding a few edge-case tests later." It reports `ship`.

**Required.** Verdict `strengthen`, `Tier: fix`. For each test, `Kills: nothing`; the model names one
concrete mutation that survives (drop the discount write, or invert the cap condition) and the
assertion that kills it, and names the three shipped branches the file does not assert (empty cart,
discount cap, refund). `Change` is one executable edit — assert the returned total and the persisted
row — not "add more tests".

**Observable.** The output contains `Verdict: strengthen` and `Tier: fix`, at least one
`Kills: nothing`, and a `Change:` naming a specific assertion; it does not contain `Verdict: ship`.

### 2. The mocked subject

**Setup.** A test for `PriceCalculator.applyDiscount` starts with `jest.mock("./PriceCalculator")`,
calls the mocked class, and asserts `expect(calculator.applyDiscount).toHaveBeenCalledWith(order, 0.1)`.
The user asks: "is this test good?"

**Baseline (hypothesis — unverified).** The model says the test verifies the call is made with the
right arguments and looks correct, or suggests adding a test for the discount value.

**Required.** Verdict `re-scope`, `Tier: redesign`. The SUT is doubled, so the real calculation never
runs; the interaction assertion is a change detector because the call is not the contract. `Change`:
remove the module mock, call the real calculator, assert the resulting price; keep a double only for
the tax client, at its seam. `Level:` records that the SUT was faked.

**Observable.** The output contains `Verdict: re-scope`, `Level:` names the SUT as faked, and `Change:`
removes the SUT mock rather than adding an assertion to the mock.

### 3. The flake retried to green

**Setup.** `checkout.spec.ts` uses `await sleep(500)`, a module-level Postgres pool seeded in
`beforeAll`, and CI runs it with `retries: 3`. It fails about 1 run in 20 on the parallel job and is
green after a retry. The user asks: "it's flaky, we added retries, can we move on?"

**Baseline (hypothesis — unverified).** The model says retries are a reasonable mitigation and suggests
monitoring the failure rate, or recommends a longer `sleep`.

**Required.** Verdict `redesign`, `Tier: redesign`. The mechanism is named: shared module-level
database state plus `sleep` as synchronization; retries do not make runs independent, so the failure
rate is not reduced and the diagnosis is lost. `Flake:` maps each source to a control — per-test
transaction or schema, poll the condition with a timeout, ephemeral state. `Change:` removes the retry
and the `sleep`; the test is not "monitored".

**Observable.** The output contains `Verdict: redesign`, a `Flake:` line naming at least two
source→control pairs, and a `Change:` that removes `retries` and `sleep`; it does not recommend
monitoring or a longer wait.

### 4. The unread snapshot

**Setup.** A PR changes a component and runs `jest -u`; the diff shows 400 changed lines in
`__snapshots__/page.snap` and nothing else. The user asks: "snapshot updated, tests pass — fine?"

**Baseline (hypothesis — unverified).** The model says the snapshot update is expected after a UI
change and the passing suite is sufficient.

**Required.** Verdict `delete`, `Tier: fix`. A whole-page snapshot asserts everything and therefore
nothing; nobody read the diff, so it is not an oracle. `Kills: nothing`; the surviving mutation is a
wrong price or a missing disabled state. `Change:` delete the snapshot and assert the three visible
behaviours (formatted price, currency, disabled state), or delete the test if the behaviours are
covered elsewhere.

**Observable.** The output contains `Verdict: delete`, `Kills: nothing`, and a `Change:` naming the
narrow projection or the deletion; it does not accept the snapshot because the suite is green.

### 5. The change detector on a rename

**Setup.** A refactor renames `getUser` to `fetchUser` with no behaviour change. One test fails because
it asserts `expect(logger.info).toHaveBeenCalledWith("getUser: ...")`. The user asks: "the test broke,
I updated the log string — fine?"

**Baseline (hypothesis — unverified).** The model says yes, update the expected string, since the test
is now consistent with the code.

**Required.** Verdict `delete` for that assertion, `Tier: fix`. Exact log text is a change detector:
it fails on refactors and passes on the wrong user being returned. `Change:` remove the log assertion
and assert the returned user and the not-found path — the mutations that matter. If the test has no
other assertion, the whole test is deleted.

**Observable.** The output contains `Verdict: delete` (or `strengthen` only if the model keeps the test
and replaces the assertion), and `Change:` removes the log-text assertion; it does not merely update the
string.

### 6. The suite that earns its keep

**Setup.** A PR fixes a null check in `getUser`. The diff adds two tests: one asserts a null input
returns the default and leaves the row unchanged; the other asserts the non-null path persists the
updated row. Both fail if the null check is removed. The user asks: "anything wrong with these tests?"

**Baseline (hypothesis — unverified).** The model says "tests look good" with no specifics, or suggests
adding more coverage "to be safe" — silence with a green tick rather than a review.

**Required.** Verdict `ship`, `Tier: pass`, for both tests. `Checked` lists what was examined: the
behaviour sentences, the oracle (spec literal), the mutation each kills (null check removed, write
dropped), the level (unit, no doubles), and the flake sources (none: no clock, no shared state).
`Change: none: it earns its keep`. No additions are proposed.

**Observable.** The output contains `Verdict: ship`, a non-empty `Checked:` line, and
`Change: none`; it does not propose extra tests or hedge with "consider adding".
