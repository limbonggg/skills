# API values

Exact values for `judge-api`. Take numbers, header names, and status codes from here; do not
approximate them from memory. Everything below is the HTTP/JSON default unless a protocol delta says
otherwise.

**Contents**

1. Status codes — the retry contract
2. Error envelope
3. Versioning
4. Deprecation and removal
5. Pagination
6. Idempotency and retries
7. Naming and scalar encodings
8. The additive set — evolvability rules
9. Protocol deltas: protobuf/gRPC and GraphQL
10. Thresholds that choose the verdict

---

## 1. Status codes — the retry contract

The status class is what client middleware acts on. A code used for the wrong class is a behaviour
change even when the body is right.

| code | use it for | client retries? |
|---|---|---|
| 200 | success with a body | no |
| 201 | resource created; send `Location` | no |
| 202 | accepted for async work; body carries the job id and its status URL | no |
| 204 | success, no body — never an error | no |
| 304 | cache revalidation, `ETag` matched | no |
| 400 | malformed request: unparseable body, bad JSON, missing required syntax | no |
| 401 | missing or invalid credentials; send `WWW-Authenticate` | no |
| 403 | authenticated, not permitted | no |
| 404 | not found — also for objects the caller must not learn exist | no |
| 405 | method not allowed on an existing path; send `Allow` | no |
| 406 | no acceptable representation, including an unsupported version media type | no |
| 409 | state conflict: concurrent edit, duplicate creation, illegal transition | no |
| 410 | permanently gone; keep the tombstone so clients stop retrying | no |
| 412 | `If-Match` precondition failed (optimistic concurrency) | no |
| 415 | unsupported request media type | no |
| 422 | syntactically valid, semantically invalid: field-level validation, business rule | no |
| 428 | server requires `If-Match`; send it and retry once | once, with the header |
| 429 | rate limited; send `Retry-After` in seconds | yes, after `Retry-After` |
| 500 | unhandled server fault — never validation, never "not found" | only if the request is idempotent |
| 502 | bad upstream response | yes, with backoff |
| 503 | overloaded or in maintenance; send `Retry-After` | yes, after `Retry-After` |
| 504 | upstream timeout | yes, with backoff |

Rules that fall out of the table:

- 4xx means the request was wrong and repeating it changes nothing; 5xx means the server failed and
  the request may succeed later. Mixing them breaks every retry policy and pages the wrong person.
- A validation failure returned as 500 is retried forever by machines and escalated to a human who
  cannot fix it.
- 400 versus 422 is the parse-versus-semantics line. Clients show 422 field errors next to inputs;
  they cannot do that with 400.
- 404 versus 403: return 404 when existence itself is privileged, and be consistent per resource. A
  mixed policy leaks the existence of rows.

## 2. Error envelope

One envelope for every 4xx and 5xx, on every endpoint:

```json
{
  "error": {
    "code": "order_already_shipped",
    "message": "Order ord_01H8X shipped on 2026-03-02 and cannot be cancelled.",
    "retryable": false,
    "request_id": "req_01H8X9Z4",
    "details": [
      { "field": "status", "issue": "immutable_after_shipment" }
    ]
  }
}
```

| member | rule |
|---|---|
| `code` | stable machine identifier, `snake_case`, never a sentence, never localized, never reused with a new meaning. Renaming a code is a break; adding one is additive. |
| `message` | for humans and logs; may change at any time; never parsed by clients |
| `retryable` | boolean that agrees with the status class; a `retryable: true` on a 400 is a bug |
| `request_id` | echoes the `X-Request-Id` response header; the only field that lets support join a client log to a server trace |
| `details` | field-level array on 422; absent otherwise; `field` uses the request's own path syntax |

Never in the body: stack traces, SQL, internal hostnames, database ids the surface does not already
expose, or another tenant's identifier.

## 3. Versioning

Pick exactly one boundary. Two boundaries is a contract nobody can reason about.

| strategy | example | forks | pick when |
|---|---|---|---|
| path segment | `/v1/orders` | the whole surface | public API, many clients, coarse majors, caches and gateways must route by version |
| media type | `Accept: application/vnd.acme.v2+json` | one representation | several representations, per-request negotiation |
| header (date or integer) | `Acme-Version: 2026-03-01` | the whole surface, pinned per request | many small breaks and long-lived clients that cannot change their base URL |
| query parameter | `?version=2` | the whole surface | last resort — it pollutes cache keys, logs, and signature schemes, and gateways strip it |

Rules:

- Additive changes ship on every live version and create no new version. A version bump is for breaks
  only.
- A version is not a deploy and not a date. Two behaviours must be runnable at the same time, or the
  boundary does not exist.
- The boundary must be visible to every layer between client and server: a header a CDN strips is not
  a boundary.
- Support the previous major for at least 6 months or two release cycles of the slowest client,
  whichever is longer. Never more than two live majors.
- Start the old major's deprecation clock the day the new one ships — `Deprecation` and `Sunset` on
  every response, not a blog post.

## 4. Deprecation and removal

| header | value | meaning |
|---|---|---|
| `Deprecation` | `@1735689600` | RFC 9745 structured field; the Unix timestamp at which the surface became deprecated |
| `Sunset` | `Wed, 31 Dec 2026 23:59:59 GMT` | RFC 8594 HTTP-date; the last instant the surface responds |
| `Link` | `<https://docs.example/migrate-orders>; rel="deprecation"` | the migration document |
| `Link` | `<https://api.example/v2/orders>; rel="successor-version"` | the replacement |

Windows and gates:

- Internal clients: at least 90 days between `Deprecation` and `Sunset`.
- Published or partner API: at least 180 days.
- Field removal additionally requires the per-field usage counter at zero for 30 consecutive days, not
  a grep. The counter is per client id, so a single straggler is visible.
- During the window the old surface keeps working and keeps appearing in the docs with a deprecation
  banner. Removing it from the docs before the code is the failure mode: new integrations get built
  on it and the clock restarts.

## 5. Pagination

- Default for any collection that mutates: keyset (cursor) pagination on a stable, unique, ordered key
  — `(created_at, id)` or the primary key.
- The cursor is opaque to clients: base64url of the sort key plus a version tag. Never document its
  internals; clients that parse it are a break waiting to happen.
- Page size: default 20, maximum 100, `limit` parameter with those bounds enforced. One number, in one
  place, in the reference — not per endpoint.
- Response shape: `{"data": [...], "next_cursor": "…", "has_more": true}`. `next_cursor` is absent or
  null on the last page.
- Offset pagination is allowed only on immutable or admin-only data, with `limit` capped at 1000 and
  an explicit `total`.
- No total count on large mutable collections. A count is a full scan, it is stale by the time the
  client reads page 2, and it invites offset pagination.

## 6. Idempotency and retries

Server side:

- Accept `Idempotency-Key` on every non-idempotent write (`POST`, and `PATCH` where it applies). The
  client generates a UUIDv4 and reuses it for every retry of the same intent.
- Store the key with the response for at least 24 hours; 7 days for anything that moves money.
- A replay returns the original status and body, plus `Idempotent-Replay: true`. A replay never
  re-executes the side effect.
- Same key with a different request body: 422, code `idempotency_key_reuse`. Silent replacement of the
  stored response is how double-charges happen.
- Keys are scoped per authenticated client, not global.

Client side (the retry policy the status table implies):

- Exponential backoff with full jitter: base 100 ms, cap 30 s, maximum 5 attempts.
- Retry 429, 502, 503, 504 and connection errors. Retry 500 only for idempotent requests. Never retry
  any other 4xx.
- Honour `Retry-After` exactly; it overrides the computed delay.
- Client timeout must exceed the server's p99 target, or every slow-but-successful call becomes a
  duplicate.

## 7. Naming and scalar encodings

| thing | rule |
|---|---|
| path | lowercase, hyphen-separated, plural noun collections: `/order-items`, `/orders/{order_id}/items` |
| path depth | at most 3 resource levels; deeper means the resource model is wrong |
| path verbs | none. `POST /orders/{id}/cancellations` or a method, never `/cancelOrder` |
| trailing slash | redirect 308 once, then pick one form and keep it |
| ids | opaque strings, `{resource}_id`, UUIDv7 or ULID; never expose sequential integers |
| JSON casing | `snake_case` for members, one convention across body, query, and headers |
| timestamps | RFC 3339 in UTC with `Z`, named `*_at`; never local time, never a bare date for an instant |
| durations | integer `*_seconds`; never a human string, never milliseconds without saying so |
| money | `{"amount": 1999, "currency": "USD"}` — integer minor units plus ISO 4217 |
| booleans | `is_` / `has_` prefix; never `null` for false |
| null | three states need three encodings: absent (not sent), `null` (explicitly empty), value |
| enums | `SCREAMING_SNAKE_CASE` on the wire, or lowercase; one convention, and clients must have an unknown branch |
| collections | `data` plus paging members; never a bare top-level array, which cannot grow |

## 8. The additive set — evolvability rules

A change is additive only if an unmodified client cannot observe it. The following are additive:

1. Adding an optional request member whose absence preserves the old behaviour exactly.
2. Adding a response member, for clients that ignore unknown members.
3. Adding an endpoint.
4. Adding an error code that no existing failure maps to.
5. Widening accepted input (a longer max length, an additional accepted format).
6. Adding an optional query parameter with the old default.
7. Adding a new representation, negotiated, without changing the default.

Everything else is a break. In particular these are breaks, and each is routinely mistaken for
additive:

- narrowing accepted input, or adding a max length or a pattern to an existing field
- making an optional request member required
- changing a default for an omitted member
- adding an enum value to a field clients switch on exhaustively
- renaming a member, a path, an error code, or a header
- changing a type (string to integer, integer to string-encoded id)
- changing nullability in either direction
- changing units, precision, timezone, or ordering
- changing which status code a failure returns
- reusing a field name or error code with a new meaning

Permanent rules: a name means one thing forever; a released error code is never reused; a removed
member's name is retired, not recycled.

## 9. Protocol deltas: protobuf/gRPC and GraphQL

**protobuf / gRPC**

- A field number is the contract. Never reuse one: `reserved 4, 7 to 9;` and `reserved "old_name";`
  before the field is deleted.
- Changing a field's type is a wire break even when it compiles; `int32` to `int64` is safe only in
  the widening direction and only for non-negative values.
- Removing a field means reserving its number and name. Adding a field is additive because unknown
  fields are preserved.
- Enum zero value must be `*_UNSPECIFIED`, and clients must keep unknown numeric values rather than
  mapping them to zero. An enum without an unknown-value path is the same trap as JSON.
- Do not change `repeated` to scalar or back. Do not move a field into `oneof` without a break.
- `google.protobuf.Any` and `Struct` hide the contract; they are additive for the schema and a break
  for every client that must interpret the payload.

**GraphQL**

- No versioning exists. Deprecation plus a usage counter is the only removal mechanism.
- Additive: a new field, a new type, a new optional argument, a new enum value *for clients with an
  unknown branch*, a new optional input field.
- Breaks: removing or renaming a field, changing a field's type, adding a required argument, adding a
  required input field, making a nullable field non-null (clients relied on null), and making a
  non-null field nullable for clients that assert non-null.
- Mark with `@deprecated(reason: "…")`, keep the resolver working, and remove only after the field's
  usage counter is zero for 30 days.

## 10. Thresholds that choose the verdict

| condition | verdict |
|---|---|
| no named client for the new surface | `do-not-add` |
| an existing surface carries the need additively | `do-not-add` |
| any break with no version boundary | `redesign` if the boundary must be added to the design; `fix-before-merge` if it is a one-line addition to an existing boundary |
| a break whose affected clients are `unknown` | treat as blocking — `redesign` until the client set is named |
| verbs in paths, 200-on-error, or an enum that cannot grow | `redesign` |
| wrong status class, missing request id, missing `Retry-After`, a cursor that exposes its internals | `fix-before-merge` |
| more than 5 custom actions on one resource | `redesign` — the resource model is wrong, not the endpoint |
| more than 40 members on one representation | split the representation or add sparse fieldsets before adding the 41st |
| every touched name classified, no unversioned break, four questions answered | `ship` |
