---
name: judge-architecture
description: Use when the shape of code is in question — "should this be its own module", "where does this belong", "is this abstraction worth it", "extract a shared helper?", "we keep touching the same files", a 2,000-line class, or a PR that adds a layer. Not for style, naming or bugs (a code review), trust boundaries (judge-risk), hot paths (judge-performance), or whether to build it at all (make-the-call).
domain: lenses
risk: reads
invocation: model
version: 0.1.0
metadata:
  form: recipe
  baseline: prose-opinion-plus-default-extraction
  eval: evals/
---

# Judge Architecture

A module earns its existence by what a caller no longer has to know. This skill makes that debt
countable before anyone extracts, splits, or layers anything.

Breadth — how many units a change must touch — is bought with depth — what each unit costs its caller.
A review that only counts breadth splits everything; a review that only counts depth layers everything.

```
NO ABSTRACTION IS RECOMMENDED WITHOUT ITS INTERFACE ITEM COUNT, ITS CALLER COUNT, AND WHAT IT REMOVES.
```

## When to use / when not to use

Use when:

- the user says "should this be its own module?", "where should this live?", "is this abstraction worth
  it?", "extract a shared helper?", "do we need a service layer?", "is this over-engineered?"
- the user says "we keep touching the same five files", "every feature is a six-file diff", "this class
  is 2,000 lines — split it?"
- a PR or refactor plan adds a module, a layer, a wrapper, an interface, a flag, or a generic mechanism
- the same code appears twice and somebody proposes to share it
- a change is bigger than the feature it implements, and nobody can say which file is at fault
- you are reviewing someone else's structure and owe them a verdict rather than an opinion

Not when:

- the question is whether the code is correct, tested, or safe — that is a code review; trust
  boundaries and injection surfaces are `judge-risk`
- the question is whether a hot path is fast enough — `judge-performance`; a deep module can still be
  slow, and a fast one can still be shallow
- the question is the wire contract's evolvability — `judge-api`; this lens judges the module behind it
- the question is whether to build the thing at all — `make-the-call`
- the work is decided and needs slicing — `split-by-frontier`
- the finding is a name, a comment, or a formatting issue — that is a review comment, and it is cheap
  enough to make without a lens

| if the situation is | use |
|---|---|
| "is this shape right?" | this skill |
| "is this change safe?" | `judge-risk` |
| "is this fast enough?" | `judge-performance` |
| "should this column exist?" | `judge-data` |
| "should this endpoint exist, and how does it evolve?" | `judge-api` |
| "should we do this at all?" | `make-the-call` |
| "the shape is fine, build it" | `red-green` |

## The process

Six phases. Phases 2–5 produce numbers; Phase 6 is the only place prose is allowed. Read
`references/architecture-values.md` before Phase 2 and take every count, threshold, and verdict rule
from it. The body names the tests; that file owns the values.

### Phase 1 — Name the unit and its callers

The unit is the module you would name in a sentence — "the user repository", "the report builder", "the
retry helper". Not a file, not a function: files change together and functions live inside units. If you
cannot name it in a sentence without "and", you have found a `split` before running a single test, and
the rest of the process is just the evidence.

Then find the callers. Grep for the exported names; read the call sites, not the call count. A unit
whose callers you have not read is a unit you are reviewing from its own documentation.

**Done when:** the unit is one sentence, and every caller is listed at `file:line` — or `Callers:
unknown` with the reason (diff-only review, private package, generated code) and the verdict narrowed to
what the diff can support.

### Phase 2 — Count the interface before you read the body

Interface first, body second. Reading the implementation first makes you judge the code you happened to
see rather than the contract the callers were given, and the contract is what they pay for.

Count `I` in its five parts and `L` in logic lines, per §2 and §3 of the value table. `I` is the thing
under review; `L` only exists to prove there is something behind it.

Then write the guarantee in one sentence — what a caller may rely on, without reading the body. If the
sentence needs the sequence of calls, or a paragraph of caveats, the unit is **obscure**: the caller will
read the implementation, so the interface is not yet an abstraction. That is an interface defect, and the
fix is the interface, not a longer comment.

**Done when:** the block prints the arithmetic — `I=8 (4 exports, 4 params)`, `L=38`, `D=4.8` — not an
adjective, and the one-sentence guarantee exists or obscurity is recorded as the finding.

### Phase 3 — Run the deletion test

Ask what happens if the unit disappears. The answer is the leverage number: how many call sites absorb
logic, and how many lines each. It is the test that distinguishes an abstraction from a rename,
because a rename has `N = 1` and absorbs nothing.

Read the call sites you listed in Phase 1. `N` from a grep count is a guess about call sites you did not
open.

**Done when:** `N` and `m` are numbers, and every caller in the `N ≤ 2` case has been named
individually — with two callers, the whole question is whether they need the same thing.

### Phase 4 — Run the leakage test on one foreseeable change

Pick the change the next quarter will actually bring — a format, a policy, a schema field, a retry rule
— and count the units that must change. Knowledge that must be updated in two units that do not call
each other is the defect this lens exists to find, because it is invisible in a diff and expensive
forever.

One change, not five. A leakage count averaged over several changes is a mood; a count on the change you
can name is a finding.

**Done when:** the change is one sentence, and `K` is a count of units that do not call each other, with
the pair or the set named.

### Phase 5 — Judge the seam, if the verdict turns on it

Only when the answer hinges on where a boundary sits or what it exposes. Check the rules in §8 of the
value table against the seam in front of you, and name its substitution contexts — a seam that cannot
name two is a boundary with one side.

**Done when:** every seam names its substitution contexts and the rule that passes or fails, or the block
says `Seam: none needed` — which is a finding, not an omission.

### Phase 6 — Emit one verdict

Take the verdict from the decision table in §9, first match wins. One verdict per review: a review that
emits two has not decided, and a review that emits none has produced an opinion.

| verdict | tier | means |
|---|---|---|
| `keep` | `pass` | the shape holds; findings are non-structural |
| `deepen` | `fix` | the interface is too wide, or the knowledge sits in two places — shrink it, absorb it |
| `split` | `redesign` | one unit, two reasons to change |
| `inline` | `redesign` | the abstraction costs more than it saves — delete it and let the callers own the code |
| `move-seam` | `redesign` | the boundary is in the wrong place — wrong layer, wrong owner, wrong rate of change |
| `redesign` | `redesign` | the decomposition is wrong at a level the unit cannot fix |
| `no-new-abstraction` | `pass` | the zero tier: do not create it |

`no-new-abstraction` is a verdict, not a refusal to give one. It is correct whenever the second caller that
needs the same thing does not exist — which is most of the time — and it is the only verdict that costs
nothing to reverse.

When the verdict is `redesign`, sketch two decompositions and name the test that chose between them. A
redesign defended by one sketch is a preference with a diagram.

```
Verdict:     <one of the seven>
Tier:        <pass | conditional | fix | redesign | refuse — mapped in the table above>
Unit:        <path:line — existing or proposed>
Interface:   I=<n> — exports <n>, required params <n>, config keys <n>, public types <n>, error modes <n>
Depth:       L=<n>, D=<L/I> → above the floor | negative (<1)
Callers:     <n> — <file:line, …> | unknown (<why>)
Removes:     <what the callers no longer have to know, one line — or "nothing">
Leverage:    delete=<n callers × m lines> · leak=<K units> · co-change=<p% over <n> commits> · pass-through=<q%>
Seam:        <unowned dependency, ≥2 substitution contexts> | none needed
Finding:     <file:line — the fact, and the symptom it causes: change amplification | cognitive load | unknown unknowns>
```

**Done when:** one verdict, every slot in the block filled, and every finding is at `file:line` with the symptom
it causes. "Cleaner", "more maintainable", and "better separation of concerns" fill no slot.

## What this lens rejects

Things this discipline refuses on sight, with the reason and the test that fires. A rejection is a
finding even when the tests would otherwise let the unit through — the shapes below are how architecture
decays while every local measurement looks acceptable.

| rejected | because | fires |
|---|---|---|
| a new abstraction with one caller | a rename with indirection: the caller pays a name and gets no hidden knowledge | deletion test, `N = 1` |
| a role name — `Manager`, `Helper`, `Util`, `Service`, `Handler` | if it cannot be named by what it does, it does two things or none | one-sentence test |
| a pass-through method or layer | the interface below it, renamed; a hop is not a boundary | pass-through share |
| a boolean or enum parameter that selects behaviour | two interfaces sharing one name; every caller must know both | caller slice |
| an interface that mirrors storage — a getter per column, a DTO per table | the schema now lives in two places and changes twice | leakage count |
| a seam whose only substitution is a mock | the boundary is in the wrong place, or there is nothing to bound | seam rule 1 |
| a generic mechanism used to avoid a decision — event bus, plugin registry, `Map<string, any>` | generality the caller pays for today against a change nobody has specified | zero tier |
| a layer that only renames | it converts a direct dependency into an indirect one and calls that architecture | pass-through share |
| a config knob for a decision the module could make | complexity pushed upward, onto every caller, forever | interface count, config keys |
| an abstraction for a caller that does not exist | an interface guessed against requirements nobody has stated | zero tier |
| an exception the module could define out of existence | every caller now handles a state that need not exist | interface count, error modes |
| a comment that explains the how | the interface did not state the outcome; the fix is the interface | obscurity, Phase 2 |

## Gotchas

- **Two call sites that look alike are usually two modules that look alike.** They differ in why they
  change — a log format versus a display format — so a shared unit needs a flag, and the flag is the
  second interface. Count reasons to change, not lines. Duplication is often the cheaper design.
- **A pass-through layer makes a diff look smaller and the system harder.** Three lines moved into a
  service is a three-line diff, a new file, a new import, and a mock. Measure the pass-through share
  before calling it architecture.
- **Mocks are the most expensive seam.** A seam justified only by a test double imposes its shape on
  production code and rots when the dependency changes. E1 requires a second context for a reason: if
  the only substitution is a mock, the boundary is in the wrong place.
- **Shallow is not wrong when it is a seam.** A four-method repository scores `D≈5` and a one-method
  wrapper `D≈1`; both are correct if they are the only place the database is named. Inlining them is
  the over-correction this lens causes when it is applied without §7.
- **A file count is not a module count.** Two files that always change together are one module; one
  file with two unrelated halves is two. Use co-change, not the directory tree.
- **A 2,000-line module with one job is deep, and splitting it by size produces shallow parts plus a
  coordination interface.** Line count is not a finding. The one-sentence test is the finding.
- **Depth is not size.** A 2,000-line function with 40 exports is shallow and huge; `D` reads high for
  both it and a genuinely deep module. §5's caller slice is what tells them apart.
- **An interface is not deep because it has one export.** One export with six required parameters is
  `I=7`. Count what the caller must know, not the number of names.
- **`git log` beats intuition on boundaries.** Files that co-change across a declared boundary — above the
  threshold in §6.2 — are one module wearing two names, and no amount of layering fixes that.

## Rationalizations

| Excuse | Reality |
|---|---|
| "It'll be reusable later" | A caller that does not exist has no requirements. You are shipping a guess with a maintenance cost. |
| "It's cleaner" / "better separation of concerns" | Name the interface items and the callers. Those are the units; "clean" is a mood. |
| "These two places are identical, so extract" | Same lines, different reason to change. Count the reasons. |
| "The layer is thin but it keeps the architecture consistent" | A layer with the abstraction of the one below it adds a hop, not a boundary. Measure the pass-through share. |
| "The tests need to mock it" | Then the seam is in the wrong place, or the test is asserting the mock. |
| "It's only a small wrapper" | Small wrapper, `I` items, `L≈I` lines: below the depth floor, and the caller pays a name for nothing. |
| "The class is huge, so split it" | Split by reason to change, not by line count. Size produces shallow parts. |
| "Keep it generic so we never have to change it" | Generality is interface the caller pays for now, against a change that may never come. |
| "It depends on the context" | Then name the test that differs and its number. |
| "I'll add the second caller later" | The second caller's requirements are unknown, so the interface is a guess. Add it when it arrives. |
| "Different words, so the rule doesn't apply" | Spirit over letter. "Modularise", "decouple", and "introduce a boundary" are extractions; count them. |

## Red flags

- You are recommending an extraction and you have not counted the callers.
- You are writing "cleaner", "clearer", or "more maintainable" where a number belongs.
- You are praising a layer without naming what it hides that the layer below does not.
- You are judging the module from its own docstring or from the diff alone, with `Callers` still empty.
- You are about to merge two units because the lines look similar.
- You are defending a seam because a test mocks it.
- You are calling a long file a defect without running the one-sentence test.
- You have written three paragraphs and no verdict.

## Limitations

- Judges shape, not worth. Whether the module should exist at all is `make-the-call`; this lens takes
  the unit's purpose as given and asks whether its boundary is in the right place.
- The counts are proxies. `D` cannot see the cost of a concept: a module at `D=15` can still hide the
  wrong thing, and no count will tell you that. The leakage test is the closest thing to a semantic
  check, and it needs a foreseeable change to test against.
- Needs the call sites. On a diff-only review the deletion count is unavailable, and the honest output
  is a narrowed verdict plus what would settle it — never `keep` on an uncounted caller set.
- Language- and paradigm-neutral, which means it cannot tell you the idiomatic shape for a given
  framework. It tells you which of two shapes is deeper; it will not write the third one the framework
  would have given you.
- Blind to runtime. A seam that is right statically can be wrong for latency, failure isolation, or
  blast radius — `judge-performance` and `judge-risk` own those, and they can overrule this lens.
