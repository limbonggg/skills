# Behaviour eval — judge-risk

Each case records the **baseline** (what a competent model does without the skill), the **required**
behaviour with it, and the **observable** that distinguishes them.

The baselines below are **written hypotheses, not yet captured from a live run** — they describe the
failure we expect, in the form it usually takes. Replace each with the observed transcript the first
time a real baseline run happens. A case without a recorded baseline is a hypothesis.

### 1. The vibe review

**Setup.** A PR adds `GET /invoices/:id` with an ORM query on `Invoice.id`, an `authenticate`
middleware on the route, and no tenant filter. The user asks "is this secure?".

**Baseline (hypothesis — unverified).** The model replies "Overall this looks secure. The route is
protected by authentication middleware. A few suggestions: validate input, use parameterized queries,
and consider adding rate limiting." No verdict, no file:line, nothing about the missing filter.

**Required.** The model names the crossing (any authenticated principal → invoice row → read capability
over another tenant's data), the worst case as an artifact ("read any tenant's invoices by incrementing
the id"), the blast radius (T3, contained by nothing), and a finding at the query line with the fix
"take `tenant_id` from the session and add `WHERE tenant_id = ?`, plus a negative test with another
tenant's credential". Verdict `fix-before-merge`.

**Observable.** The output contains a verdict from the enum and a findings row whose `file:line` points
at the query, not at the route or the middleware.

### 2. The security-theatre review

**Setup.** A PR renames a helper function and extracts a constant. The user asks "security review?".

**Baseline (hypothesis — unverified).** The model produces a generic checklist — CSRF, XSS, SQL
injection, rate limiting, dependency versions — and concludes "no major security concerns, but consider
adding rate limiting to the new helper".

**Required.** The model runs the four Phase-0 questions, answers all four no with the files that
decided it, and returns verdict `no-threat-model` with the reason ("no principal, no input reaching an
interpreter, no secret, no widened reach"). No findings table.

**Observable.** The verdict is `no-threat-model`, the four answers are present, and there is no
speculative hardening advice.

### 3. The internal-service exemption

**Setup.** A PR adds `POST /internal/reindex`, no authentication, deployed in the same VPC as the app.
The description says "internal only, the network is trusted".

**Baseline (hypothesis — unverified).** The model accepts the framing: "Since this is an internal
endpoint behind the VPC, authentication is not required. Looks fine."

**Required.** The model treats "internal" as a principal, not a boundary: any process on the network,
including a compromised pod or an SSRF pivot, can trigger it. Rejection-list hit (unauthenticated
mutation), blast radius at infrastructure tier if reindex touches every tenant. Verdict `fix-before-merge`
if a handler-level check fixes it, `redesign` if the capability itself should not exist.

**Observable.** The verdict is not `ship`, and the boundary line names the network position as a
principal rather than citing the VPC as a mitigation.

### 4. The middleware illusion

**Setup.** A PR adds `PATCH /documents/:id`. The handler calls `authorize(req.user, 'documents:write')`,
and the update query filters on `Document.id` only.

**Baseline (hypothesis — unverified).** The model sees the `authorize` call and reports "authorization
is enforced in the handler; no issues found".

**Required.** The model separates authentication and role capability from object ownership: the
capability check says this user may write *some* document; nothing says *this* document is theirs.
Finding at the query line, T2 blast radius, fix is an ownership predicate plus the negative test.

**Observable.** A finding cites the query line while acknowledging the `authorize` call, and the
verdict is `fix-before-merge`.

### 5. The log line

**Setup.** A PR adds `logger.info('incoming', req.body)` to a webhook receiver. The user asks whether
the change is safe to deploy.

**Baseline (hypothesis — unverified).** The model replies "Logging is good practice for debugging.
No security issues in this diff."

**Required.** The model identifies the body as carrying credentials (the webhook signature header and
the customer payload), marks it a rejection-list hit for secret handling, assigns the tier by what the
payload contains, and fixes at the logger — redaction of `authorization`, `cookie`, and the configured
secret fields, with bodies dropped rather than truncated.

**Observable.** The findings table has a row at the log line naming the redaction point, and the
verdict is `fix-before-merge` rather than `ship-with-conditions`.
