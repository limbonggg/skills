# Behaviour eval — judge-architecture

Each case records the **baseline** (what a competent model does without the skill), the **required**
behaviour with it, and the **observable** that distinguishes them.

The baselines below are **written hypotheses, not yet captured from a live run** — they describe the
failure this lens expects, quoted in the form it usually takes. Replace each with the observed
transcript the first time a real baseline run happens. A case without a recorded baseline is a
hypothesis.

### 1. The extract reflex

**Setup.** Two twelve-line functions in different files format a timestamp the same way. One produces
the log line, the other the UI label. The user asks: "these are identical — extract a shared helper?"

**Baseline (hypothesis — unverified).** The model agrees, cites DRY, and writes the shared helper with a
`style` parameter defaulting to the log format. It notes that both call sites now import one module.

**Required.** The deletion test and the reasons-to-change test: `N = 2`, but the callers want different
things — ISO in UTC for logs, locale-relative for the UI — so the shared unit needs a parameter only one
caller passes. Verdict `no-new-abstraction`, with the twelve duplicated lines defended as two modules
that happen to look alike, and a note on what would change the answer (a third caller that wants the log
format).

**Observable.** The verdict is exactly `no-new-abstraction`; the block's `Callers` line names both call
sites; `Removes` reads "nothing" or names only the shared *mechanism* while the finding explains why the
*policy* differs. No new file is proposed.

### 2. The long file

**Setup.** `ReportBuilder`, 1,800 lines, three exports, one job: turn a query result into a rendered
report. The user asks: "this is 2,000 lines — should we split it?"

**Baseline (hypothesis — unverified).** The model proposes five classes by responsibility — a formatter,
a paginator, a template loader, a section renderer, a facade — and calls the result better separated.

**Required.** Run the one-sentence test before the size test: the unit's purpose needs no "and", and
there is one reason to change. `D` is high, `S` is small, `K` is 0–1. Verdict `keep`, with the finding
stated in the other direction: splitting by line count would produce five shallow units plus a facade
that adds `I` items and hides nothing.

**Observable.** The verdict is `keep`; the block prints the `D` and `S` numbers; the reply says
explicitly that size is not a finding. No split is proposed.

### 3. The pass-through layer

**Setup.** A `services/` directory over `repositories/`. Fourteen public methods; twelve are one-line
delegations with renamed arguments. The user asks: "is this layering right?"

**Baseline (hypothesis — unverified).** The model approves — "consistent layering, clear separation
between business logic and data access" — and suggests adding a DTO mapper for symmetry.

**Required.** Measure the pass-through share (`P = 86%`) and apply §6.3: the layer re-exports the
abstraction below it. Verdict `inline` — collapse the layer, let callers use the repositories — unless
E3 applies, which it does not, because no trust or process boundary is crossed. The two methods that do
contain logic move to where their callers are.

**Observable.** The block's `Leverage` line carries the `pass-through=` percentage; the verdict is
`inline`; the word "consistent" does not appear as a justification.

### 4. The mock-shaped seam

**Setup.** A `PaymentGateway` interface with `authorize`, `capture`, `void`, and `refund`, one real
implementation, one mock. Charging an order takes four calls in the right order. The user asks: "design
review: is this the right seam for the payment provider?"

**Baseline (hypothesis — unverified).** The model approves: the dependency is injected, the tests are
fast, and the interface matches the provider's SDK, which it calls "a thin, honest adapter".

**Required.** Two separate judgements. The seam's *location* passes — the provider is unowned, and
production plus test give it two substitution contexts (E1). Its *shape* fails rule 5: four methods that
map 1:1 to provider calls force every caller to know the provider's state machine. Verdict `deepen`:
`charge(order) → outcome`, with the four calls becoming implementation.

**Observable.** The block's `Seam` line names the dependency and both contexts; the `Finding` names the
state machine the caller must know; the verdict is `deepen`, not `keep` and not `move-seam`.

### 5. The proposed generic

**Setup.** An exporter that writes CSV. The user asks: "make this generic so we can add formats later —
a registry, a plugin interface, maybe config-driven."

**Baseline (hypothesis — unverified).** The model builds it: an `Exporter` protocol, a registry keyed by
format, a factory, and a config key. It mentions extensibility and open/closed as the reason.

**Required.** Count the callers: one, and it wants CSV. There is no second caller that needs the same
thing, so the interface for the second format is a guess about requirements that do not exist. Verdict
`no-new-abstraction`, with the note that the second format arrives with its own requirements and the
refactor at that point is cheap.

**Observable.** The verdict is `no-new-abstraction`; `Callers` is `1`; `Interface` counts the items the
proposal *would* add. No registry, protocol, or config key is written.

### 6. The diff-only review

**Setup.** A PR adds a new `BillingCalculator` module of 300 lines. The reviewer has the diff, not the
repository. The user asks: "is this module the right shape?"

**Baseline (hypothesis — unverified).** The model judges from the diff, praises the single responsibility,
and suggests one more extraction — with no caller count anywhere, because the diff does not show call
sites.

**Required.** Phase 1 cannot complete: `Callers: unknown (diff-only)`. The deletion count and the
co-change test are unavailable, so the verdict is narrowed to what the diff supports — the one-sentence
test, the interface count, the pass-through share — and the reply names exactly what would settle it: the
call sites, and whether a second consumer exists.

**Observable.** The `Callers` slot reads `unknown` with the reason; no `keep` or `inline` verdict is
issued; the reply names the missing observation rather than substituting confidence for it.
