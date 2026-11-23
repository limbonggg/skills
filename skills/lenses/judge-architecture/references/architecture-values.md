# Architecture values

The numbers this lens decides with. Read it before Phase 2 and take every count, threshold, and
verdict rule from here. The body names the tests; this file owns the values.

**Contents**

- §0 Where these numbers come from
- §1 The vocabulary, locked
- §2 Counting the interface (I)
- §3 Counting the logic (L)
- §4 The depth floor (D)
- §5 Caller slice (S)
- §6 Leverage tests — deletion (N), co-change (C), pass-through share (P), leakage (K)
- §7 Exemptions (E1–E3)
- §8 Seam placement — four location rules, one shape rule
- §9 Decision table, first match wins
- §10 Worked verdicts
- §11 Refused framings

---

## 0. Where these numbers come from

Ousterhout's *A Philosophy of Software Design* gives principles and no thresholds. Depth is
"functionality relative to interface complexity", and the book declines to make that a formula. The
numbers below are this library's operationalisation, chosen so that two reviewers looking at the same
module reach the same verdict. They are arguable, and should be argued with. Cite the principle; never
cite the number as though the book said it.

Two things this file refuses, and why:

- **The depth ratio as a ranking.** `L/I` rewards a large body behind a narrow interface, which is also
  the definition of a blob. It is used as a floor check and nothing else. A high `D` is not a
  compliment.
- **Layering as a virtue.** Every layer is paid for in interface items the caller must learn. A layer
  must hide an abstraction the layer below does not already have. Measure the pass-through share
  before praising the architecture.

## 1. The vocabulary, locked

Use these seven words in the verdict block. When an _Avoid_ word appears in your own reasoning, stop and
translate — the loose word is where the generic advice gets in.

| term | means | _Avoid_ |
|---|---|---|
| depth | behaviour a caller gets per interface item it must learn | size, complexity, lines of code |
| interface | everything a caller must know to use the unit: names, params, config, types, error modes | API, signature, surface |
| information leakage | one design decision that must be known in two units | coupling, duplication, DRY violation |
| seam | a place where a dependency's behaviour can be replaced without editing the code around it | abstraction layer, injection point, boundary |
| pass-through | a unit whose interface is the interface below it, renamed | wrapper, delegation, facade |
| leverage | what the callers no longer have to know | reuse, sharing, DRY |
| obscurity | a reader cannot tell what the code does without running it | readability, clarity, mess |

## 2. Counting the interface (I)

Count 1 per:

- exported function, method, class, or type
- required parameter
- required config key, env var, or constructor argument the caller must supply
- public type the caller must construct or name in a call
- error mode the caller must handle explicitly — a thrown type, a returned error, a retry contract

Count 0.5 per optional parameter whose default changes behaviour. Count 0 for a parameter that only
tunes performance or logging.

Do not count private members, test-only helpers, or docs. Do not count a dependency's own types
re-exported through the unit — count them at the boundary unit that names the dependency.

## 3. Counting the logic (L)

Non-blank, non-comment lines of the unit's implementation. Exclude tests, generated code, and type
declarations with no runtime body. `L` is a size proxy for "how much behaviour is behind this
interface", and nothing more.

## 4. The depth floor (D)

`D = L / I`

| D | reading | what it licenses |
|---|---|---|
| ≥ 1 | a module exists | nothing on its own — go to §5 and §6 |
| < 1 | negative depth: the interface costs more than the body it hides | `inline`, unless an exemption in §7 applies |

A high `D` is not a compliment. `D = 40` describes a deep module and a 2,000-line function with 50
exports equally well; §5 and §6 tell them apart.

The verdict block reports the floor check and nothing else — `above the floor` or `negative`. There is
no "deep" label, because this ratio cannot produce one honestly.

## 5. Caller slice (S)

The number of distinct interface items **one call site** touches to accomplish **one task**.

| S | reading |
|---|---|
| ≤ 7 | one caller can hold the interface in working memory — fine |
| 8–12 | the caller is doing two jobs, or the unit has two interfaces — look for `split` |
| ≥ 13 | the caller is orchestrating a subsystem — `redesign` |

Count per call site, not per module. A 40-export library is fine when each caller touches four of them.

## 6. Leverage tests

### 6.1 Deletion count (N) and absorbed lines (m)

Remove the unit. `N` = call sites that would have to absorb logic. `m` = the median lines each absorbs.

| N | reading |
|---|---|
| 0 | no caller exists — `no-new-abstraction` if proposed, `inline` if it is already dead code |
| 1 | one caller absorbs the code — `inline`; the unit is a rename with indirection |
| ≥ 2, same mechanism | earns its keep |
| ≥ 2, differing by a parameter or a flag | suspicion of `split`: two modules behind one name |

### 6.2 Co-change (C)

Across a declared boundary — module, package, service — the share of commits in the last 6 months (or
200 commits, whichever is smaller) that touch both sides.

```sh
git log -n 200 --since="6 months ago" --pretty=format:'@' --name-only -- <path-a> <path-b> \
  | awk -v RS='@' -v a='<path-a>' -v b='<path-b>' \
      'index($0,a)&&index($0,b){n++} index($0,a)||index($0,b){t++} \
       END{if(t)printf "%d/%d = %.0f%%\n", n, t, 100*n/t; else print "no commits in window"}'
```

`n` counts commits touching both paths, `t` commits touching either. The placeholder paths must appear
in the `awk` flags exactly as they do in the `git log` pathspec.

| C | reading |
|---|---|
| < 20% | the boundary holds |
| 20–49% | note it; not decisive |
| ≥ 50% | the boundary is in the wrong place — `move-seam` |

Renames and moved files distort the count. When the pair was renamed inside the window, say so and
treat the result as a note, not a number.

### 6.3 Pass-through share (P)

The share of a unit's public methods whose body is a single call passing its arguments through
unchanged — a rename and a `return` are allowed, a decision is not.

| P | reading |
|---|---|
| < 10% | the unit has its own abstraction |
| 10–29% | note it; the unit is mostly an adapter |
| ≥ 30% | the unit is a re-export, not an abstraction — `inline` it (unless E3) |

### 6.4 Leakage count (K)

Pick one foreseeable change: a format, a policy value, a schema field, a protocol detail, a retry rule.
Count the units that must change, then subtract the ones that call each other — a caller changing with
its callee is an ordinary dependency, not a leak.

| K | reading |
|---|---|
| 0–1 | the knowledge is hidden |
| 2 | note the pair; it may be a legitimate contract |
| ≥ 3 | `deepen` — absorb the knowledge into one unit |

## 7. Exemptions

A shallow or pass-through unit is acceptable — not good, acceptable — when one of these holds. Name the
exemption in the block. An unnamed exemption is a rationalisation wearing a number.

| id | exemption | test |
|---|---|---|
| E1 | dependency substitution | the unit is the only place an unowned dependency is named, and ≥ 2 contexts substitute it — production plus test, or two deployments |
| E2 | dispatch | the unit implements a contract the language, framework, or wire format requires: polymorphism, a plugin contract, a serializer hook |
| E3 | boundary crossing | the unit is where a trust, process, or serialization boundary is crossed; the interface may mirror the far side because the far side is not yours |

E1 applies to the unit, not to each method inside it. A repository whose four query methods all name the
database is one unit with one exemption, not four.

## 8. Seam placement

Location rules decide `move-seam`. The shape rule decides `deepen`.

| # | rule | test | failure |
|---|---|---|---|
| 1 | ≥ 2 substitution contexts | count them: production, test, a second deployment | 1 → not a seam |
| 2 | one seam per unowned dependency | count the seams for the same dependency in the unit | ≥ 2 → one is decorative |
| 3 | the rate of change differs across it | name how often each side changes | equal → no seam, just a call |
| 4 | at the outermost point you own | is there an owned layer outside it? | yes → the seam sits one level too deep |
| 5 | the interface states outcomes, not the far side's call sequence | does a method map 1:1 to a provider call? | yes → an adapter, not an abstraction; legal only under E3 |

## 9. Decision table, first match wins

| # | condition | verdict |
|---|---|---|
| 0 | the unit is proposed and there is no second caller that needs the same thing — N = 0, or the shared unit would need a parameter that selects behaviour — and no E1/E2/E3 applies | `no-new-abstraction` |
| 1 | D < 1, no exemption | `inline` |
| 2 | the unit's one-sentence purpose needs "and", or two independent change drivers are nameable | `split` |
| 3 | K ≥ 3 for one foreseeable change | `deepen` |
| 4 | a seam's interface mirrors the far side, no E3 | `deepen` |
| 5 | S ≥ 13 | `redesign` |
| 6 | P ≥ 30%, no E3 | `inline` |
| 7 | a seam location rule fails | `move-seam` |
| 8 | C ≥ 50% across the declared boundary | `move-seam` |
| 9 | one foreseeable change touches more than 5 units that do not call each other | `redesign` |
| 10 | none of the above | `keep` |

Rows 0 and 1 are the zero tier. Row 0 is the answer more often than any other in this table, and a
reviewer who never reaches it is decorating, not reviewing.

## 10. Worked verdicts

**`UserRepository` — four query methods over one ORM.** I = 8 (4 exports, 4 required params), L = 38,
D = 4.8. N = 9 call sites, m ≈ 6. E1 holds: it is the only place the ORM is named, and the suite
substitutes it. Verdict `keep`. The next query method added here costs one more interface item and
needs no new exemption — the exemption was spent on the unit.

**A proposed `formatTimestamp` shared by two files.** I = 2, L = 12, D = 6. The two callers want
different things: ISO in UTC for logs, locale-relative for the UI. The shared unit would need a `style`
parameter that only one caller passes — no second caller that needs the same thing. Verdict
`no-new-abstraction`; the twelve lines stay duplicated and change independently.

**A `services/` layer over `repositories/`.** 14 exports, 12 of them one-line delegations, P = 86%.
Verdict `inline`: collapse the layer, call the repositories. Nothing a caller knows changed except the
name of the file.

**`PaymentGateway` with `authorize`, `capture`, `void`, `refund`.** E1 holds — the provider is not
ours. Rule 5 fails: charging one order takes four calls and the caller must know the provider's state
machine. Verdict `deepen`: the interface is `charge(order) → outcome`, and the four calls become
implementation.

**A 2,000-line `ReportBuilder` with three exports.** I = 7 (3 exports, 4 required params), L ≈ 1,800,
D = 257. S = 4 at every call site. One reason to change: the report changes when the report changes.
Verdict `keep`. Size is not a defect, and splitting it by line count would produce four shallow units
and a new coordination interface.

## 11. Refused framings

Framings this lens will not decide with, each with the reason:

- **"Depth = implementation lines ÷ interface lines."** The ratio rewards bloat and punishes small
  honest modules. Use the counts as a floor check, per §4.
- **"SOLID says one reason to change, so split."** One reason to change is a test for `split`; it is
  not a licence to split a module whose single purpose is large.
- **"Duplication is the enemy."** Two call sites with the same lines and different reasons to change
  are two modules that happen to look alike. Count the reasons, not the lines.
- **"Extract a service so it can be reused."** A caller that does not exist has no requirements, so its
  interface is a guess that ships.
- **"Add a comment explaining it."** A comment that explains the *how* is a symptom: the interface did
  not state the outcome, so the caller has to read the body. Comments belong on what a caller may rely
  on and why a decision was taken — they are part of the abstraction, not a repair for its absence.
- **"The architecture should be consistent."** Consistency is a tiebreaker between two shapes that both
  pass; it never outranks leverage.
