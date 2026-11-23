# Behaviour eval — judge-api

Each case records the **baseline** (what a competent model does without the skill), the **required**
behaviour with it, and the **observable** that distinguishes them.

The baselines below are **written hypotheses, not yet captured from a live run** — they describe the
failure we expect, quoted in the form it usually takes. Replace each with the observed transcript the
first time a real baseline run happens. A case without a recorded baseline is a hypothesis.

### 1. The additive assertion

**Setup.** A handler returns an `Order` object. The diff adds `"fulfillment_status": "partial"` to the
response. The model is asked to review the change before merge.

**Baseline (hypothesis — unverified).** The model says the change is additive because no existing field
changed, notes that clients ignore unknown fields, and approves. No client is named and no decoder is
read.

**Required.** The change is classified by a client observation, not by the diff: the mobile client's
decoder is checked for strict unknown-member handling (`extra="forbid"`, `DisallowUnknownFields`,
`FAIL_ON_UNKNOWN_PROPERTIES`). If any client is strict or unknown, the finding blocks; if all clients
tolerate unknown members, the verdict is `ship` with the client named as evidence.

**Observable.** The artifact's `Breaks` line names the decoder behaviour of at least one named client,
or states `unknown: 1` and the verdict is not `ship`. "Additive" appears with a client attached, never
alone.

### 2. The endpoint nobody asked for

**Setup.** A product ticket says "users should be able to see whether their order shipped". The model
is asked to add the endpoint. The `Order` resource already returns `shipped_at`, and one internal
dashboard is the only caller.

**Baseline (hypothesis — unverified).** The model designs `GET /orders/{id}/shipping-status` with a new
response schema, pagination, and an error envelope, and writes the handler.

**Required.** The zero tier fires: `do-not-add`, with the alternative named — read `shipped_at` from the
existing `GET /orders/{id}`, or add the field to the list response. If a new surface is genuinely
needed, the review must name the client that needs it in the next release and why the existing
representation cannot carry it.

**Observable.** The verdict is `do-not-add`, the `Surface` line is the existing resource, and no new
path schema is produced. A `do-not-add` followed by a complete design for the declined endpoint is the
failure.

### 3. The convenient error

**Setup.** A new `POST /payments` returns `200 {"success": false, "error": "card_declined"}` because
the existing frontend already parses that shape.

**Baseline (hypothesis — unverified).** The model accepts the shape as consistent with the frontend and
reviews only the field names, missing that the status class is wrong.

**Required.** `redesign`: a declined card is 422 with the standard error envelope, a stable `code`
(`card_declined`), `retryable: false`, and the request id. The frontend adapter is the thing that changes, not the
contract — retry middleware, caches, and dashboards cannot see a 200 error.

**Observable.** The verdict is `redesign`, the finding names the status class as the defect, and the
proposed contract uses the shared envelope rather than a per-endpoint shape.

### 4. The rename with a changelog entry

**Setup.** The diff renames `user_name` to `username` in the response and changes `id` from an integer
to a string UUID. The PR description says "documented in the changelog; no clients affected".

**Baseline (hypothesis — unverified).** The model accepts the description, checks that the repo's own
call sites were updated, and approves — the grep is clean because the clients live in another repo.

**Required.** Both changes are classified as breaks with the client observation stated (a renamed
member fails to deserialize; an integer-typed field receiving a string fails to parse). With no
version boundary in the diff, the verdict is `redesign`: add the boundary, or keep both members through
a deprecation window with a usage counter.

**Observable.** Two `Breaks` entries, each naming what a client observes; `Boundary` is not `none`;
and the verdict is `redesign` or `fix-before-merge` — never `ship` on the strength of a changelog.

### 5. The enum that grows

**Setup.** `status` is `PENDING | SHIPPED | CANCELLED`. The diff adds `RETURNED`, and the model is told
"it's just a new value, nothing existing changed".

**Baseline (hypothesis — unverified).** The model agrees that enum growth is additive and approves,
without checking how clients switch on the value.

**Required.** Growth is additive only where clients map unknown values to an `unknown` branch. The
review names the exhaustive switches it can see (Go `switch` without `default`, Rust `match` without
`_`, TypeScript `never`), and either confirms an unknown branch in each or classifies the change as a
break with the boundary or the client-side unknown-handling contract as the fix.

**Observable.** The finding quotes at least one concrete switch site, and the verdict depends on
whether an unknown branch exists — not on the fact that no existing value was removed.

### 6. The deprecation with no pulse

**Setup.** `GET /v1/orders/export` is to be removed "next quarter". The model is asked to write the
deprecation plan.

**Baseline (hypothesis — unverified).** The model writes a paragraph saying the endpoint is deprecated,
advises announcing it in the changelog, and proposes deleting it after the quarter.

**Required.** A dated removal path: `Deprecation` and `Sunset` headers with RFC 9745 / RFC 8594 values,
a `Link` to the migration guide, a per-client usage counter, and the gate that removal waits for the
counter to be zero for 30 consecutive days. The window is ≥ 90 days internal, ≥ 180 days published.

**Observable.** The `Removal` slot contains two dates and a named counter. "Monitor usage" or "announce
in the changelog" alone does not satisfy it, and no removal date is proposed without the counter.
