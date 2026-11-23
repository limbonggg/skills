# Behaviour eval — split-by-frontier

Each case records the **baseline** (what a competent model does without the skill), the **required**
behaviour with it, and the **observable** that distinguishes them.

The baselines below are **written hypotheses, not yet captured from a live run**. They describe the
failure we expect, in the form it usually takes, and are labelled as such. Replace each with the
observed transcript the first time a real baseline run happens; a case whose baseline is still a
hypothesis has not yet earned its place.

### 1. The numbered list

**Setup.** A user asks "break this notification rework into tickets — it's too big for one session."
The work spans API, a queue, a template layer, and a settings screen.

**Baseline (hypothesis — unverified).** The model returns a numbered list of eight steps ordered by
build sequence — "1. Add the notifications table, 2. Build the queue consumer, 3. Add the API
endpoints, 4. Build the template renderer, 5. Add the settings screen, 6. Wire up preferences, 7. Add
tests, 8. Deploy" — with no dependencies, no demo per step, and no statement of what is still unknown.

**Required.** The model produces the four-part artifact: an observable destination, tickets that each
cut through the layers they touch with a demo line, blocking edges, a fog list of questions it cannot
yet phrase sharply, and an out-of-scope bucket. It sizes each ticket to one fresh context window.

**Observable.** Every ticket line carries a demo of behaviour and a `blocked by` field; at least one
fog entry is a question with a clearing condition; no ticket reads "add the table" or "add tests" with
no demonstrable behaviour of its own.

### 2. The layer stack, restructured

**Setup.** A plan already exists as "schema ticket, API ticket, UI ticket, test ticket". The user asks
"can you make this plan better?"

**Baseline (hypothesis — unverified).** The model reorders the four tickets, adds acceptance criteria
to each, and appends a "write tests" ticket at the end — preserving the horizontal slicing.

**Required.** The model names the horizontal slicing as the defect, merges the layers into slices that
are each demoable alone, and labels any genuine prefactor (a migration that must exist before a slice
can be built) rather than hiding it inside a slice.

**Observable.** No ticket's acceptance criteria reference another ticket's deliverable; each ticket's
demo names user-visible behaviour; any non-demo ticket is explicitly labelled prefactor.

### 3. The new requirement

**Setup.** Mid-plan, the user says "oh, we also need SSO eventually." The destination was written as
"existing users can manage their notification preferences".

**Baseline (hypothesis — unverified).** The model appends "Add SSO" as the last ticket, or omits it
entirely with no mention.

**Required.** The model measures the requirement against the destination and puts it in exactly one
bucket: a ticket with edges if it serves the destination, or the out-of-scope bucket with a one-line
reason if it does not. Nothing is silently dropped.

**Observable.** The SSO item appears exactly once in the plan — frontier or out of scope — and an
out-of-scope placement carries the reason it is beyond the destination.

### 4. The fog written as a task

**Setup.** The plan contains "Investigate billing provider — 2 days" as a ticket.

**Baseline (hypothesis — unverified).** The model accepts it as a ticket, maybe re-estimates it, and
leaves it in the build order.

**Required.** The model applies the phrasing test: if the question cannot be stated sharply, the item
is fog with a clearing condition ("does the provider support per-seat proration? — cleared by reading
their pricing API"), not a ticket. It enters the frontier only once the question is sharp.

**Observable.** The billing item sits in the fog section as a question plus what would clear it; the
frontier contains no ticket whose deliverable is "investigate".

### 5. The wide refactor

**Setup.** The destination requires renaming `account_id` to `workspace_id` across roughly 400 files.
The user asks for tickets.

**Baseline (hypothesis — unverified).** The model produces one ticket per directory, each promising a
green build, or a single "rename it everywhere" ticket.

**Required.** The model recognises that no vertical slice can land green and sequences expand (add the
new column and dual-write) → migrate in batches sized by blast radius → contract (drop the old column),
with only the final integrate ticket required to be green.

**Observable.** The ticket names show the expand / migrate-batch / contract shape, and the green-build
promise is attached to the integrate ticket rather than to every batch.

### 6. "No fog, it's all clear"

**Setup.** Greenfield request: "plan out the whole product." The user has given one paragraph of
intent and no decisions.

**Baseline (hypothesis — unverified).** The model invents answers to unstated questions (auth model,
tenancy, billing) and produces a twenty-ticket waterfall that reads as certain.

**Required.** The model runs the sweep, records the questions it cannot yet phrase as fog, and either
plans only the part it can specify or states that the first work is to clear fog. It does not invent a
decision and build on it.

**Observable.** The plan contains a non-empty fog section, and no ticket depends on a decision the
model made up without recording it as a decision.
