---
name: judge-risk
description: Use when a change touches something an attacker can reach — "is this secure", "security review", "auth", "secrets", "webhook", "raw SQL", "multi-tenant", "public endpoint", "before we ship". Not for whether the code works (use prove-it), whether the shape is right (use judge-architecture), or whether an exposure is worth accepting (use make-the-call).
domain: lenses
risk: reads
invocation: model
version: 0.1.0
metadata:
  form: recipe
  baseline: generic-security-advice-without-a-named-boundary-or-a-verdict
  eval: evals/
---

# Judge Risk

A diff read for correctness shows what the change *does*. This lens shows what it *opens*: the
boundary it moves, the worst thing behind that boundary, how far one compromise reaches, and a verdict
from a fixed set of six. The discipline is application-security review — boundary-first threat
modelling of a diff, with OWASP and NIST as the value floor rather than as a checklist.

```
NO SECURITY VERDICT WITHOUT THE BOUNDARY CROSSED AND THE WORST THING AN ATTACKER GETS.
```

## When to use / when not to use

Use when:

- the user says "is this secure?", "security review", "does this leak", "can another tenant read
  this", "is it safe to expose", "we're putting this on the internet", "pen test next week",
  "someone could just change the ID, right?"
- the diff adds or moves an auth check, a role, a token, a secret, a webhook receiver, a file upload,
  an outbound request built from request data, a SQL/HTML/shell/template string, a tenant filter, or a
  public route
- a new principal appears: a public route, a service account, an admin endpoint, a third-party
  callback, a build step holding credentials
- someone justifies a shortcut with "it's internal", "it's behind the VPN", "we'll add auth before
  launch", "it's just an ID"
- you are reviewing someone else's PR and need what the change opens, not whether it runs
- a deploy is about to read or write another person's data

Not when:

- the question is whether the code works — that is `prove-it`
- the question is module shape, seams, or depth — that is `judge-architecture`
- the exposure is already known and priced, and the question is whether to accept it — that is
  `make-the-call`; this lens prices the exposure, the owner accepts it
- the diff moves data between tables with no new principal and no new input — that is `judge-data`
- the question is the cost or latency of the check — that is `judge-performance`
- you are asked to audit an entire existing system or produce a compliance attestation — that is a
  pentest and an auditor, not a diff review

| if the situation is | use |
|---|---|
| "can user A read user B's row?" | this skill |
| "is this endpoint fast enough under load?" | `judge-performance` |
| "should we accept this risk and ship?" | this skill to price it, then `make-the-call` to rule |
| "does the fix work?" | `prove-it` |
| "is this migration reversible?" | `judge-data` |
| "is this a good abstraction?" | `judge-architecture` |
| "explain how the auth flow works" | no lens: answer the question |

## The words this lens uses

Use these words in the verdict. The generic word on the right is how the finding gets lost: it
describes the symptom and hides the mechanism.

| term | means here | _avoid_ |
|---|---|---|
| trust boundary | a place where data or a request crosses from a less-trusted principal to a more-trusted one | "input", "the edge", "validation point" |
| principal | the thing making a request: anonymous, a user, another tenant's user, a service, an admin, the build pipeline | "user", "client" — both collapse the attacker into the customer |
| capability | what a principal can *do* once inside, regardless of who they are | "role", "permission" — labels, not powers |
| blast radius | what one compromise reaches: rows, tenants, money, infrastructure, downstream installs | "impact", "severity" — scores, not extents |
| secret | a value whose disclosure is a loss even if nothing else changes | "credential", "config" — a config value can be public |
| injection surface | any place a string from one context is interpreted as code, a query, a path, or markup in another | "user input" — input is not the bug; interpretation is |

## The rejection list — reject on sight

Every row is a blocking finding, not a note. The right-hand column is the only observable that clears
it; "it's fine because…" is not one. If you cannot point at the clearing condition in the diff, the
row stands.

| rejection | why | what clears it |
|---|---|---|
| SQL/NoSQL/GraphQL/LDAP built by concatenation, f-string, template literal, or an ORM's raw escape hatch with any non-constant part | the value becomes the query | every value bound; every identifier (table, column, sort direction) from a literal allow-list in the same file |
| a secret literal in source, committed config, a URL query, a log line, an error body, or a fixture that points at production | disclosure is the entire loss, and history keeps it after deletion | read from a secret store at run time, never printed; the fixture holds a revoked key |
| a mutating route (POST/PUT/PATCH/DELETE) with no authentication on the handler path | the internet is the principal; "internal service" is a network position, not an identity | the handler's own code rejects an unauthenticated request, and a test asserts it |
| authorization decided from client-supplied data: a role in body/query/header, a trusted `X-User-Id`, or JWT claims read before signature verification | the attacker writes their own permissions | the principal and its capabilities come from a verified session or signed token, server-side |
| a tenant or owner id taken from the request when the session already carries it | horizontal privilege escalation by editing one field | the filter value comes from the session; the request value is ignored or compared |
| shell, `eval`, dynamic import, template render, or deserialization fed by anything but a constant | string becomes code | the interpreter is never reachable by request data: a fixed command plus an allow-listed argument set |
| a filesystem path, outbound URL, redirect target, or proxy destination built from request data without canonicalisation and an allow-list | traversal and SSRF; the metadata endpoint is one hop from any URL fetcher | resolve, then compare against an allow-list; link-local and private ranges refused at connect |
| TLS verification disabled (`verify=False`, `rejectUnauthorized: false`, `curl -k`, `InsecureSkipVerify`) anywhere in a committed file | every later copy inherits it | verification on, and the test uses a local CA instead |
| credentialed CORS (`Access-Control-Allow-Origin: *` with credentials), or a token in a URL query | any origin reads the response; URLs land in logs and `Referer` headers | explicit origin allow-list; token in an `Authorization` header or an `HttpOnly` cookie |
| a secret or token compared with `==` where the value is attacker-supplied | a byte-at-a-time oracle | constant-time comparison for tokens, MACs, and reset codes |
| a catch-all around an authorization check that turns failure into success (`except: pass`, `if err != nil { return nil }`, `catch { next() }`) | the failure mode of an auth check is denial, never a pass | errors from the check propagate; the default path is 403 |
| a new route with no explicit authorization call and no test where the wrong principal gets 403/404 | nothing was decided, so everything is allowed | an authorization call in the handler plus a negative test with another principal's credential |
| an auth failure logged with the attempted secret, or a request body logged with `Authorization`/`Cookie` headers | logs are the longest-lived copy of a secret | redaction at the logger, not at each call site |
| a new dependency that runs an install script, or an unpinned version in a security-relevant path | the supply chain is inside the trust boundary | pinned by hash in the lockfile; install script reviewed or disabled; upstream repo named |

A rejection-list hit is `fix-before-merge` when a line fixes it and `redesign` when the fix moves the
boundary. It is never `ship-with-conditions`: conditions gate a deploy, they do not patch a hole.

## The process

### Phase 0 — Decide whether there is a threat model at all

The zero tier. Four questions, answered from the diff:

1. Does it add or move a trust boundary — a new principal, or data crossing between principals?
2. Does it add an input that reaches an interpreter?
3. Does it add, move, or touch a secret?
4. Does it widen the blast radius — more rows, tenants, money, or infrastructure reachable from one
   compromise?

All four "no" → verdict `no-threat-model`, with the reason and the file that decided it. Stop. That is
a complete review, not a skipped one. Renames, pure extractions, a constant, a layout change, a log
line with no principal data, a fixture with no real credential, and a docs change all land here.

Any "yes" → continue. Adding a threat model to a rename is the failure this tier exists to prevent.

**Done when:** the four answers are written, each naming the file or hunk that decided it.

### Phase 1 — Map the crossings

For each entry point the diff adds or changes, write one row: principal → what crosses → capability
conferred. Include the data layer, not only the route: name the line where the tenant or owner filter
is applied. A handler that never applies it confers a capability regardless of what middleware ran
first.

**Done when:** every added or changed entry point is a row with a principal and a capability, and any
row whose principal is "unknown" is written down as a finding.

### Phase 2 — Name the worst thing behind each crossing

One sentence, a concrete artifact, and the cheapest path to it: no credential / any user's credential /
one privileged credential / code execution. "Data exposure" is not a worst case; "any tenant's invoices
by editing `org_id`" is.

**Done when:** each crossing has a worst case naming an artifact and a path class.

### Phase 3 — Sweep interpreters and secrets

Interpreters reachable by request data: SQL, ORM raw escape hatches, shell, template, HTML, regex,
path, header, redirect, deserializer, dynamic import.

Secrets touched: where it lives, how it travels, what surface can print it (error body, debug page,
crash report, log), its lifetime, its rotation, and who can read it. Take every number from
[references/risk-values.md](references/risk-values.md) — never from memory.

**Done when:** each interpreter is marked reachable or not with its line, and each secret has all six
attributes written down.

### Phase 4 — Set the blast radius and its containment

Tier the worst case: single user / single tenant / all tenants / infrastructure / supply chain. For
each finding, name the mechanism that contains it — tenant filter, key scope, network policy, rate
limit, separate credential. A tier with no containment is blocking, whatever the exploit's difficulty.

**Done when:** every finding carries a tier and either a containment mechanism or the word "nothing".

### Phase 5 — Emit the verdict and the findings

Fixed shape, no prose around it:

```
Verdict:       <one of the six values in the next section>
Tier:          <pass | conditional | fix | redesign | refuse — see enum table>
Boundary:      <principal → crossing → capability, or "none crossed: <why>">
Worst case:    <one sentence, concrete artifact>
Blast radius:  <tier>, contained by <mechanism or "nothing">
Findings:
| # | file:line | attack (one line) | tier | fix (one line) |
```

`ship-with-conditions` lists the conditions in the same block, each with an observable check and an
owner. "Harden later" is not a condition; "key rotated and the old one revoked, verified by a request
that 401s" is.

**Done when:** every finding has `file:line`, an attack, and a fix naming the mechanism; the verdict is
one of the six; no fix reads "validate input" without naming the validator and the rejected set.

## The verdict enum

| verdict | tier | means | use when |
|---|---|---|---|
| `no-threat-model` | `pass` | this does not need a threat model | all four Phase-0 questions are no, and the untouched boundary is named |
| `ship` | `pass` | every crossing it makes is already handled in the diff | findings are absent, not deferred |
| `ship-with-conditions` | `conditional` | the exposure is acceptable only while named conditions hold | each condition is observable after deploy and has an owner |
| `fix-before-merge` | `fix` | the shape is right and a line is wrong | every finding has a one-line fix inside this diff |
| `redesign` | `redesign` | the boundary is in the wrong place | authz in the client, secret in the wrong tier, filter above the data layer, a public route where a signed webhook would do |
| `reject` | `refuse` | the capability should not exist | no containment makes it acceptable: cross-tenant read, unauthenticated admin, secret in a public artifact |

`reject` is about the change; `redesign` is about where the boundary sits. The difference is whether
any line inside this diff could make it safe.

## Gotchas

- An `authenticate` middleware proves *someone* is logged in; nothing proves *this row* is theirs. The
  finding is the missing `WHERE tenant_id = ?`, and it looks like an ordinary query. Read the data
  layer, not the route.
- A test asserting 401 for no token passes on an endpoint that returns 200 for another user's token.
  Authorization needs the negative test: user A's credential, user B's resource, expect 403 or 404.
- Parameterisation covers values, not identifiers. `ORDER BY ?` cannot be bound — the placeholder
  becomes a literal or an error, never a column, so the allow-list you thought you had does not exist.
- ORMs are safe until the escape hatch: `.raw()`, `$queryRawUnsafe`, `whereRaw`, `.extra()`,
  `Sequelize.literal`, `.query(string)` all interpolate. The import of the ORM is not the finding; the
  raw call is.
- Removing a secret from the working tree does not remove it from `git log`, the CI cache, the image
  layer, or a fork. It is burned at commit time, so rotate first and rewrite history second.
- A dev server bound to `0.0.0.0` that skips auth when the environment variable is not `production` is
  a production boundary on conference wifi. Check what the deploy sets, not what the config defaults
  to.
- An environment variable is not "out of code" if it is echoed into `docker run -e`, a CI log, a crash
  report, or a debug page that dumps `process.env`.
- A URL regex is not SSRF protection: a redirect or DNS rebinding defeats the check between validation
  and connect. The protection is an egress allow-list resolved at connect time, with link-local and
  private ranges refused.
- A JWT payload is base64, not encrypted, and readable by anyone holding the string. A claim is worth
  only the signature verification that ran before it was read; `jwt.decode` without verification is a
  client-supplied authorization decision.
- Edge rate limiting does not protect a per-account budget: an attacker with ten thousand addresses
  gets ten thousand times the edge limit against one account. Count the account for credential
  stuffing, the IP for scraping.
- `SELECT *` plus a serializer is a data-exposure decision made by whoever adds the next column. Name
  the fields.
- A log line is a secret's longest-lived copy: retention outlives the incident, and the redaction has
  to be at the logger because call sites forget.

## Rationalizations

| Excuse | Reality |
|---|---|
| "It's internal / behind the VPN" | Internal is a principal, not a boundary. The VPN's blast radius is everything behind it. |
| "We'll add auth before launch" | Then the endpoint exists without it today, and launch is the date nobody re-checks. |
| "The framework handles that" | Name the middleware and the line. Frameworks protect the routes you registered through them, and not the query inside. |
| "It's just a read endpoint" | Reads are how data leaves. A GET returning any tenant's rows is the worst finding in most reviews. |
| "Nobody would guess the ID" | IDs are enumerated in seconds. A UUID is not an access control. |
| "Input is validated on the client" | The client is the attacker. |
| "It's a small diff" | The size of the diff is not the size of the boundary. One query line is the whole tenant isolation. |
| "The scanner didn't flag it" | Scanners find patterns; this lens finds boundaries. A clean scan is not a threat model. |
| "I'll note it as a follow-up" | A blocking finding deferred is a decision to ship it. If it ships, it needs `make-the-call` with an owner and a date. |
| "It's only a risk if someone finds it" | The verdict is about what the change opens, not about whether the attacker has read the diff. |
| "Different words, so the rule doesn't apply" | Spirit over letter. "Harden later", "acceptable for now", and "low risk" are the same verdict without the work. |

## Red flags

- Your review has observations and no verdict.
- You wrote "validate all user input" instead of naming the validator and the rejected set.
- You have not written down who the attacker is.
- Your worst case is a category ("data exposure", "privilege escalation") rather than an artifact.
- You are reading the diff for correctness and calling it a security review.
- You are about to offer "internal", "VPN", or "obscure URL" as a mitigation.
- You are listing every theoretical weakness instead of the one reachable path.
- You are building a threat model for a rename, a constant, or a layout change.

## Limitations

- Reviews a change, not an organisation. It cannot produce a system-wide boundary map, and a `ship`
  here is not a pentest, a compliance attestation, or a claim that the rest of the system is safe.
- Cannot verify deployed state — WAF rules, IAM policy, network policy, secret-store contents. A
  finding about configuration is about the configuration in the diff; the running system is unverified
  until someone reads it.
- Judges dependencies from the manifest and lockfile. A compromised upstream release published after
  the review is out of reach.
- Prices exposure but cannot accept it. Whether a priced risk is tolerable belongs to the owner and is
  ruled in `make-the-call`.
- The floors in `references/risk-values.md` are cited with their sources and a date. A newer OWASP or
  NIST revision supersedes them; update the table, not the prose.

## Reference docs

Read [references/risk-values.md](references/risk-values.md) before writing a verdict, and take every
threshold, parameter, and lifetime from it — never from memory.

Read [references/attack-paths.md](references/attack-paths.md) when a finding lands on a surface you
have not reviewed before: it gives the attack, the one-line test that detects it, and the fix, per
surface.
