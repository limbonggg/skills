---
name: read-before-write
description: Use when an edit is about to land in code whose users you have not enumerated — "just change this one line", "rename it", "make it optional", "who else uses this", "don't break anything", "it's legacy, nobody knows" — or a symbol you opened straight to a plausible line. Not for whether the change is worth making (make-the-call), the shape it should take (judge-architecture), or proving it works afterwards (prove-it).
domain: execution
risk: reads
invocation: model
version: 0.1.0
metadata:
  form: recipe
  baseline: edit-from-first-plausible-site
  eval: evals/
---

# Read Before Write

A blind edit is a bet that the only caller is the one on screen. This skill makes the caller list, the
contract, and the invariants exist before the diff does.

```
NO EDIT UNTIL EVERY CALLER IS NAMED AND THE CONTRACT IS READ.
```

## When to use / when not to use

Use when:

- you are about to change a symbol whose other users you have not listed — a function, a method, an
  exported name, a struct field, a config key, a column, an error type
- the user says "just change this one line", "quick fix", "it's a small change", "rename it", "make it
  optional", "who else uses this", "don't break anything", "it's legacy", "nobody knows how this
  works", "we're late, just do it"
- the edit changes a signature, a default, a return shape, an error type, a serialized field, a config
  key, or a validation rule — each of those is a contract even when the code compiles
- you opened a file straight to the plausible line and it looked easy
- an earlier attempt broke something you did not know existed
- the module is unfamiliar, has no tests, or its tests are the only specification it has

Not when:

- the change is decided and the discipline is test-first — that is `red-green`; this skill is the
  reading that makes the failing test expressible
- the question is whether the diagnosis under the change is true — that is `weigh-evidence`
- the question is whether the shape is right — that is `judge-architecture`; this skill maps the shape
  you are about to cut, it does not rule on it
- the work needs slicing — that is `split-by-frontier`
- the schema change needs a safety verdict — that is `judge-data`; this skill finds who reads the
  column, `judge-data` rules on the change
- the change is written and needs verifying — that is `prove-it`
- you are still deciding what to change at all — that is `frame-the-problem`

| if the situation is | use |
|---|---|
| one symbol, users unknown, edit ready | this skill |
| one symbol, users known, edit ready | `red-green` |
| the edit changes a column or its type | this skill to map the readers, `judge-data` to rule on the change |
| the map shows the seam has forty callers | `judge-architecture` for the shape, then come back with a different seam |

## The process

Five phases and one artifact. The phases are bounded: they end when the note's slots are full, not when
you understand the system.

### Phase 1 — Name the seam

The seam is the single symbol the diff will change — one function, one field, one key. Write it as the
symbol plus `file:line`. If you cannot name one symbol, you are not ready to edit; you are still framing
the problem, and the edit will land wherever the cursor happens to be.

Choosing the level is part of this. Changing a helper that forty callers share is usually the wrong
level, and the map will say so. Prefer the narrowest symbol whose contract you can state.

**Done when:** the seam is one symbol at `file:line`, and one sentence says what its callers are
entitled to assume.

### Phase 2 — Enumerate every caller

Start at the module's outer surface — the route, handler, job, CLI, or test that reaches it — because
that is where the module makes promises to anything outside itself. Then walk inward to the seam.

Two searches, because they find different things. Semantic references (a language server, a
reference-aware grep) find code. Literal search for the bare name and its fragments finds strings:
config keys, template variables, serializer field names, event names, SQL, migration files, i18n keys,
dispatch tables, `getattr`-style lookups.

For each caller write `file:line` and a disposition: **update** (must change with the seam), **verify**
(compiles unchanged, behaviour must be checked), **depends-on-current-behaviour** (relies on the bug,
the typo, or the quirk you are about to remove).

**Done when:** every caller is a `file:line` with a disposition, the module's entry points are named,
and the identifier and the bare string were both searched across code, config, templates, schema, and
migrations.

### Phase 3 — Read the contract at the seam

Four things, each of which can break a caller with the signature untouched:

- **pre** — what the caller must guarantee on the way in: nullability, ordering, non-empty, encoding,
  units.
- **post** — what the caller may rely on coming out: shape, aliasing, sortedness, caching, idempotency.
- **errors** — thrown or returned, which types, and whether callers catch those types specifically or
  with a bare catch-all.
- **ownership** — who may mutate the argument, who keeps the returned reference, who releases it.

Read the deserialization site and the catch sites, not the annotation. A type hint is a claim by the
author; the wire is the truth.

**Done when:** pre, post, errors, and ownership each cite a `file:line` that establishes them, or say
plainly "undocumented, assumed X".

### Phase 4 — Read the invariants that cross the seam

An invariant is a fact that is true everywhere but enforced somewhere else: this list is sorted, this
map is keyed by tenant, this field is set before the row is visible, this call happens under the lock.
Find the enforcement — an assertion, a test, a database constraint, a comment, a caller's ordering — and
name the site. An invariant with no enforcement site is a fact you are about to break silently.

**Done when:** every invariant the change could violate is named with its enforcement site, and the
ones you checked and found unenforced are marked as such.

### Phase 5 — Write the note, then let it change the plan

```
Seam:       <symbol> at <file:line>
Entry:      <how the module is reached from outside: route, handler, job, CLI, test>
Callers:    <file:line → update | verify | depends-on-current-behaviour> ...
Contract:   pre <…> / post <…> / errors <…> / ownership <…>
Invariants: <fact> enforced by <site>
Unknown:    <what this search cannot see: other services, cron, notebooks, dynamic dispatch, data>
```

Then read the note as if a stranger wrote it. If the caller list is long, the seam is wrong. If a caller
depends on current behaviour, that is a decision, not a detail — price it with `make-the-call`. If
`Unknown` is doing real work, say so to whoever owns the deploy.

**Done when:** every slot is filled, no caller is left without a disposition, and `Unknown` names what
you could not verify rather than saying "none".

## Gotchas

- The string caller is invisible to find-references. `rg 'handle_foo'` returns nothing while
  `"handle_" + verb`, a YAML `action: foo`, a JSON field name, a template variable, an i18n key, or a
  `getattr(self, f"on_{event}")` reaches the same code. A rename that compiles is not a rename that
  deploys — search the bare fragment in config, templates, schema, and migrations, and read the dispatch
  site.
- Language-server references stop at the language boundary. A Python job reading a table a Rails
  migration owns, a TypeScript client binding an OpenAPI field, a shell script curling the endpoint —
  none appear in the references list. The caller list ends at the tool's boundary, not the system's; the
  `Unknown` slot is for the rest.
- A caller that depends on the current bug is a contract. A test asserting the wrong output, a client
  parsing the malformed field, a downstream job keyed on the typo'd enum value. "Fixing" the function
  breaks them, and the breakage reads as your bug. Mark them `depends-on-current-behaviour` and decide
  in the open.
- The signature is not the contract. `(user: User) -> str` says nothing about whether `user` may be null
  at runtime, whether the call throws, or whether the returned string may be mutated. Read the
  deserialization site and one real call site.
- Bare catches swallow a changed error. If callers wrap the call in `except Exception` or `catch (e)`,
  changing what is thrown converts a crash into a wrong value three layers away, and nothing in the
  suite notices. Count the catch sites before changing the error contract.
- In-place mutation is an output the signature does not show. A helper that sorts or normalizes the list
  it was handed changes the caller's data and returns the same type. Look for callers that reuse the
  object after the call, and for callers that ignore the return value.
- The line that makes no sense has a commit behind it. `git log -L <start>,<end>:<file>` or blame is
  cheaper than reasoning from the code: the odd null check usually has an incident, a vendor workaround,
  or a timezone bug in its message, and the message is the invariant.
- Generated and vendored copies eat the edit. A checked-in `.pb.go`, an SDK copy, or a file with "do not
  edit" in its header is rebuilt from a schema or a spec. The seam is the generator's input; editing the
  output is undone at the next build.
- Dead-looking code is loaded. `__all__`, a re-export, an entry-point registry, a plugin manifest, or a
  flag in production config keeps a symbol alive where the import graph shows nothing. Check the
  registry before deleting.

## Rationalizations

| Excuse | Reality |
|---|---|
| "It's a one-line change" | One line is what a blind edit looks like from inside. Line count is not blast radius. |
| "It's obvious what this function does" | Obvious is how the plausible spot feels. The caller list is what makes it true. |
| "I'll check the callers after — the compiler will tell me" | The compiler sees code call sites in one language. It is silent about strings, config, templates, SQL, and other services. |
| "The tests will catch it" | Tests catch what they cover. The caller you never saw is usually the one with no test. |
| "I already read the file" | You read the file you are editing. Callers live in the files you did not open. |
| "Keeping the signature means callers can't break" | Behaviour, errors, ownership, and in-place mutation all break callers with the signature untouched. |
| "Reading the module is a waste of context" | You are not reading the module. You are reading the seam's callers and the symbol's contract — a bounded list, not a codebase. |
| "The user is in a hurry" | The hurry is what makes the blind edit expensive. The map is one turn; the incident is a day. |
| "Different words, so the rule doesn't apply" | Spirit over letter. Renaming a config key, changing a default, adding a serialized field, and deleting an "unused" method are all edits to a contract. |

## Red flags

- You are about to edit a line and cannot name a single caller.
- Your caller list came from one identifier search and nothing else.
- You are reading the module to *confirm* the edit you already drafted.
- You can state the function's return type but not its error contract.
- You are explaining why this module is simple enough to skip the map.
- You are about to delete a symbol whose only evidence of disuse is "nothing imports it".
- You are calling the read done because the file scrolled to the end.

## Limitations

- Cannot see callers outside the repository: another service, a mobile client, a cron entry, a notebook,
  an analyst's query. It forces them into the `Unknown` slot; it cannot enumerate them.
- Static enumeration is incomplete in dynamic languages. `getattr`, `send`, metaclasses, and runtime
  registration defeat both references and grep; the mitigation is reading the dispatch site, and the
  dispatch site can be data you do not have.
- Tells you what the change can break, not whether the change is right. Correctness and behaviour are
  `red-green` and `prove-it`.
- The map is bounded by the seam. A change that is wrong at the level of the seam produces a clean note
  about the wrong thing; the stranger-read in Phase 5 is a judgement, not a check.
