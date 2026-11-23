---
name: judge-api
description: Use when a change touches an API surface a client can bind to — "add an endpoint", "rename this field", "breaking change", "bump the version", "deprecate v1", "the app already ships against it", an OpenAPI/proto/GraphQL diff, or an error format. Not for schema and migration safety (use judge-data), auth and injection surfaces (use judge-risk), or whether the feature is worth building (use make-the-call).
domain: lenses
risk: reads
invocation: model
version: 0.1.0
metadata:
  form: recipe
  baseline: additive-by-assertion
  eval: evals/
---

# Judge API

A published surface is a promise to code you cannot redeploy. This lens makes the agent name the
client, classify every touched name as additive or break, and answer "must this exist?" before it
designs a shape.

```
NEVER EDIT A PUBLISHED SURFACE IN PLACE — ADD TO IT OR VERSION IT.
```

"Published" means reachable by a client outside the release you are shipping. A handler with one
caller in the same deployable is an interface, not a surface; that is `judge-architecture`.

## The vocabulary this lens thinks in

| term | means here | _avoid_ |
|---|---|---|
| **surface** | every name a client can bind to: path, method, field, enum value, status code, error code, header, default value | API, interface, contract |
| **client** | code you do not control and cannot redeploy in the same release as the server | consumer, caller, user |
| **additive** | a change an unmodified client cannot observe — established by its decoder, not by the diff | non-breaking, backwards-compatible |
| **break** | a change an unmodified client observes as different behaviour or a failure | regression, breaking change |
| **version boundary** | the mechanism that lets two behaviours run at once: a path segment, a media type, or a header | release, migration window |
| **removal path** | the dated sequence from deprecated to gone, plus the counter that makes the date a measurement | deprecation policy, cleanup |
| **error contract** | the machine-readable shape of failure: stable code, status class, retryable signal, request id | error handling, error message |

## Reject on sight

These are refused with the reason, not negotiated. A design containing one of them is already wrong,
before any other question is asked.

| rejected | why |
|---|---|
| a break with no version boundary | old clients break in the deploy window and you have no way to run both behaviours at once |
| an error returned as `200` with an `error` field | every retry library, cache, circuit breaker, SDK generator, and dashboard reads it as success; the layer that must act cannot see it |
| verb-named REST paths — `/getUser`, `/createOrder`, `/deleteItem` | the method is the verb; duplicating it hides the resource from caches, gateways, and generated clients, and GET ends up mutating |
| an enum that can gain values without a client-side unknown branch | growth becomes a crash in every exhaustive switch, and the server cannot tell which clients are ready |
| offset pagination on a collection that mutates | inserts and deletes shift the offset; pages skip and duplicate rows with no error to show for it |
| money as a float, or a timestamp with no timezone | precision loss and DST ambiguity are baked into the contract permanently — a client parses the value, not the docs |
| `null` meaning absent, empty, and unknown at once | three states encoded as one cannot be told apart by any client, and every later fix is a break |
| a member whose meaning depends on another member's presence | no schema validates it, no client can ignore it safely, and the pairing cannot evolve independently |
| internal ids, database primary keys, or secrets in a response "because they were convenient" | exposure is one-way; the value is now in a client's logs and cache forever |
| a deprecation with no date and no usage counter | the removal never happens, or happens by surprise — both are how clients get broken by a "cleanup" |
| a new endpoint where an existing surface carries the need | a surface is a lifetime commitment: another thing to version, document, secure, and deprecate |

## When to use / when not to use

Use when:

- the user says "add an endpoint", "new route", "rename the field", "change the response", "is this a
  breaking change", "bump the version", "deprecate v1", "our clients", "the app is already shipping
  against it", "what should the error look like"
- a diff touches an OpenAPI document, a `.proto`, a GraphQL schema, a route table, a serializer, or an
  error-code list
- an endpoint is proposed and nobody has named a caller
- a field is to be removed, retyped, made required, made nullable, or given a new default
- someone says "it's additive" and no client has been checked

Not when:

- the question is column shape, migration order, or data reversibility — that is `judge-data`; this
  lens judges the surface, not the storage behind it
- the question is authz, rate limiting, injection, or secret exposure — that is `judge-risk`
- the question is whether the feature earns its cost — that is `make-the-call`; this lens asks only
  whether the *surface* must exist, which is narrower and answerable without a business case
- the "API" is an internal module boundary with one caller in the same repo — that is
  `judge-architecture` (seam, depth, locality)
- the review is style inside one module: naming consistency, formatting, file layout — no client binds
  to those

| if the situation is | use |
|---|---|
| a new endpoint, or a field added, changed, or removed on a published surface | this skill |
| the same change, and the worry is the migration under it | `judge-data` |
| a client being written against someone else's API | this skill's client rules, then `weigh-evidence` on the vendor's compatibility claim |
| a PR that adds a route but the feature's value is unproven | `make-the-call` for the feature; this lens for the surface |
| an internal function signature with callers in one deployable | `judge-architecture` |

## The process

### Phase 1 — Bind the surface and name the clients

List every name a client can bind to that this change touches: path, method, request field, response
field, enum value, status code, error code, header, default, ordering, nullability, units. For each,
name a client — a repo, an app version in a store, a partner, a script — or write `unknown`.

Read the shape from the source of truth, not from the handler: the OpenAPI/proto/schema if one exists,
and diff it. Handlers and specs drift, and clients bind to the spec.

**Done when:** every touched name carries a named client or `unknown`, and the number of `unknown`
entries is stated. A binding that was not listed is a change nobody classified.

### Phase 2 — Classify each name: additive or break

One test decides: *can an existing client, unmodified and not recompiled, observe a difference?* If
yes, it is a break, whatever the changelog calls it.

Classification is per client, and the verdict takes the worst case: a member that is additive for the
web client and a break for a strict mobile decoder is a break.

Check the reject list first. A design that contains one of those rows is already wrong, and a version
boundary does not make it right — it only contains the damage. The rows are findings, not trade-offs.

Break, even when nothing was removed:

- a field made required, or validation made stricter (a new max length, a rejected format)
- a changed default for an omitted field
- a new enum value reaching an exhaustive switch
- a field retyped, renamed, made nullable, or made non-nullable
- changed units, timezone, ordering, or precision
- a different status code or error code for the same failure
- a new response field, for clients with strict decoders

Additive, for a client that tolerates unknown members:

- a new optional request field whose absence changes nothing
- a new response field, a new endpoint, a new error code no existing failure maps to

**Done when:** every name from Phase 1 carries `additive` or `break`, with the client observation that
decided it. "Probably fine" is `unknown`, and it stays in the verdict as a finding.

### Phase 3 — Run the zero tier: does this surface have to exist?

Three questions, in this order. Any "no" ends the review at `do-not-add`:

1. **Is there a named client that needs it in the next release?** "Mobile might want it", "someone
   will need it", "it's more RESTful" are not clients. An endpoint with no client is a maintenance
   contract with no revenue.
2. **Can an existing surface carry it additively?** A new optional field, query parameter, or filter on
   the resource that already owns the data beats a new path. Every path is a second place to fix bugs,
   version, and deprecate.
3. **Is it a distinct resource with its own identity and lifecycle?** If it is an operation on
   something that exists, it is a sub-resource or a method on that resource — not a new top-level noun
   invented for the occasion.

The zero verdict is a real answer and often the most valuable one this lens produces: **do not add
this endpoint**, with the existing surface that carries the need named in the same breath. Declining
is cheap now and expensive after three clients integrate.

**Done when:** either `do-not-add` with the alternative surface named, or a new surface justified by a
named client *and* a distinct resource identity.

### Phase 4 — Shape what survives against the contract rules

Read `references/api-values.md` before writing a shape or a verdict, and take every number, header
name, and status code from it. A shape invented from memory is a plausible-looking contract with the
wrong retry semantics, and the retry semantics are what clients encode.

Four questions, ordered by what they cost when wrong:

- **Naming** — noun-resource paths, plural collections, no verbs, one casing convention across path,
  query, and body.
- **Error contract** — one envelope for every failure: stable machine code, correct status class, a
  retryable signal, a request id.
- **Versioning** — where the boundary lives and what it covers. Choose one strategy once; a second
  strategy later is itself a break.
- **Removal** — the dated path from deprecated to gone, with a per-field usage counter, so the sunset
  date is a measurement rather than a hope.

**Done when:** each of the four has a written answer, and every value it cites appears in the
reference table.

### Phase 5 — Emit the verdict

One verdict from the enum, in the artifact. Prose around it is optional; the slots are not.

```
Verdict:   ship | fix-before-merge | redesign | do-not-add
Tier:      <pass | conditional | fix | redesign | refuse — see mapping below>
Surface:   <every path, field, enum, status, or header this change binds>
Clients:   <named clients; "unknown: N" for the rest>
Breaks:    <each break and the client observation that makes it one — or "none">
Boundary:  <the version boundary, or "none: additive">
Removal:   <deprecation date, sunset date, usage counter — or "n/a">
Findings:  <path:line — the rule — what a client observes>
```

Choosing the verdict — highest severity wins when two apply:

- **`do-not-add`** — no named client, or an existing surface carries the need. Do not design a shape;
  the shape is the thing being declined.
- **`redesign`** — the surface must exist, but a reject-list row is present, or the shape is wrong in a
  way that is cheaper to fix now than to version later: verbs in paths, 200-on-error, an enum that
  cannot grow, a break with no boundary.
- **`fix-before-merge`** — the shape is sound and a local rule is violated: a wrong status class, a
  missing request id, a missing `Retry-After`, a cursor whose internals are exposed, or a break an
  existing boundary already covers with a one-line change.
- **`ship`** — every touched name classified, no unversioned break, all four questions answered.


Tier mapping (`TAXONOMY.md` §lenses): `ship` → `pass`, `fix-before-merge` → `fix`,
`redesign` → `redesign`, `do-not-add` → `refuse`. Write the tier beside the verdict — a multi-lens
review merges on it, highest tier wins.

**Done when:** the verdict is one of the four, and every `break` from Phase 2 has either a version
boundary or a finding that blocks it.

## Gotchas

- "Additive" is a claim about the client's decoder, not about the diff. `DisallowUnknownFields` in Go,
  Pydantic's `extra="forbid"`, and Jackson's `FAIL_ON_UNKNOWN_PROPERTIES` all turn a new response
  field into a runtime failure. Read the client's decoder before calling a field additive.
- Adding an enum value is a break for any client with an exhaustive switch: Go `switch` without
  `default`, Rust `match` without `_`, a TypeScript `never` check. Growth is additive only where
  clients were built to map unknown values onto an `unknown` branch.
- Tightening validation is a break with no diff to show for it. Adding a max length, a stricter email
  pattern, or rejecting a format that used to pass breaks clients relying on the lenient behaviour —
  the field is unchanged, the accepted input set is not.
- Changing a default is invisible in a schema diff and changes behaviour for every client that omits
  the field. A new optional `include_archived`, defaulted to `true`, silently changes results for
  callers that never send it.
- `200` with `{"error": ...}` reads as success to retry middleware, caches, circuit breakers, SDK
  generators, and every dashboard. The layer that must act on the failure is the layer that cannot
  see it.
- Offset pagination on a collection that mutates between pages skips and duplicates rows: an insert
  before the current offset shifts every later page. Keyset pagination on a stable, unique, ordered
  key is the only shape that holds under writes.
- Stopping writes to a field is not removing it. Clients break on the read that returns nothing, not
  on the write that stopped. Removal needs a deprecation window plus a per-field usage counter; a grep
  of your repo cannot see clients outside it.
- Status codes are the retry contract. 429 and 503 are retried, 400 is not, and 500 pages a human at
  some shops and is retried forever at others. A validation failure returned as 500 pages the wrong
  person and is retried by machines that should have stopped.
- `PATCH` with JSON merge-patch uses `null` for "remove this member", which collides with `null` for
  "unset" — a client cannot express "leave it alone". Either define an explicit sentinel or require a
  full `PUT`.
- `POST` is not idempotent and every HTTP client retries on timeout. Without a stored
  `Idempotency-Key`, a network blip becomes a duplicate order. The retry is the default, not the
  exception.
- A path version (`/v1/orders`) forks the whole surface; a media type or header version forks one
  representation and can be negotiated per request. Both work. Mixing them later is a second break
  with no boundary left to spend.
- Money as a float loses cents at the boundary, and a timestamp without a timezone is ambiguous across
  a DST change. Both are permanent: a client parses the value, not the documentation.

## Rationalizations

| Excuse | Reality |
|---|---|
| "It's additive — we're only adding a field." | Additive to which decoder? Name the client's unknown-field behaviour or the claim is unverified. |
| "Nobody uses that field." | Then remove it with a usage counter, not with a grep. "Nobody" is a claim about code you cannot see. |
| "We can version it later if someone complains." | Later is after the break. The client that broke has no older version to pin to — you removed the choice. |
| "It's internal, only our app calls it." | Internal clients are clients. They deploy on their own schedule, and the app in the store is the version you broke. |
| "The error field is easier for the frontend." | It makes every layer between you and the frontend treat failure as success: retries, caches, alerts. |
| "It's just a rename — the meaning is identical." | The name is the binding. A rename is a removal plus an addition, priced as both. |
| "We'll document the breaking change." | Documentation does not recompile a client. A changelog entry is a notification, not a migration. |
| "The deadline is Friday." | The boundary costs one path segment or one header. The break costs every client's release cycle. |
| "The schema is the contract, and we bumped the schema version." | The schema version is not a version boundary. Clients do not pin to it unless they can send it. |
| "Different words, so the rule doesn't apply" | Spirit over letter. "Cleanup", "align the naming", and "make it consistent" are changes to a published surface. |

## Red flags

- You are about to change a field's type, name, nullability, or default in place.
- You are designing an endpoint and have not named a client that needs it this quarter.
- You are writing `200` on an error path because the frontend finds it convenient.
- You are calling a change additive without naming how a strict client decodes it.
- You are removing a field because a grep in this repo found no usage.
- You are putting a verb in a path because the resource noun was hard to name.
- You are describing a deprecation with no date and no usage counter.
- You are reaching for a new major version to avoid classifying a change you could have made additive.

## Limitations

- Reads the contract as written in the repo. Clients outside the repo are invisible, so "no client uses
  this" is always an inference — label it as one instead of spending it as a fact.
- Does not review authz per field, rate limiting, injection, or secret exposure; those are `judge-risk`.
  A surface can pass every rule here and still leak another tenant's rows.
- Does not design storage: column types, backfills, and reversibility are `judge-data`. This lens only
  judges the surface the storage is exposed through.
- HTTP/JSON is covered in depth in the reference; protobuf and GraphQL carry their own evolution rules,
  and the reference names their deltas rather than pretending one table fits all three.
- Cannot make a break free. A version boundary contains the damage and buys time; it does not remove
  the cost of running two behaviours until the old one sunsets.
