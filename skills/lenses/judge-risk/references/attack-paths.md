# Attack paths

One row per surface. Read the row for the surface your finding landed on, and use the test column as
the check you can run against the diff. The attack column is written as the sentence a finding cites,
because "SQL injection" is a category and "read any row by closing the quote" is an attack.

| surface | the attack | the one-line test | the fix |
|---|---|---|---|
| SQL, ORM raw | close the quote or append `OR 1=1` and read every row | is the request value inside the query string, rather than passed as a bind parameter? | bind every value; allow-list identifiers in the same file |
| shell | append `; curl attacker` to a filename and have it executed | does any request value reach a shell string, a `sh -c`, or a backtick? | fixed command plus allow-listed arguments; no shell |
| template, HTML | a stored `<script>` runs in every viewer's session | is request data interpolated into markup without the engine's auto-escape, or rendered as raw HTML? | context-aware escaping; a sanitizer only for rich text, never `innerHTML` |
| path | `../../etc/passwd` or an absolute path reaches a file outside the intended root | is the path built from request data and joined without resolve-then-prefix-check? | resolve, compare the prefix against a fixed root, reject symlinks |
| outbound URL (SSRF) | point the fetcher at `169.254.169.254` or an internal admin host | can a request value choose the host or the scheme? | hostname allow-list resolved at connect; refuse private and link-local ranges after redirects |
| redirect | `?next=https://evil` turns your domain into a phishing hop | is the redirect target taken from the request without an allow-list? | allow-list of paths, or a signed relative path |
| file upload | upload a `.php`/`.svg` with a script, then request it back | is the stored name, the content type, or the storage location derived from the request? | magic-byte check, random name, outside the webroot, `Content-Disposition: attachment`, never executed |
| JWT | swap the payload, or set `alg: none`, and the server believes the claims | is any claim read before the signature check, or is the algorithm taken from the token header? | pinned algorithm, verify first, reject `none`, short expiry |
| OAuth / OIDC | reuse an authorization code, or redirect the callback to an attacker host | is `state` checked, is the redirect URI matched exactly, is the code single-use? | exact redirect match, `state` + PKCE, single-use codes |
| webhook receiver | post a forged event and the system acts on it | is the signature verified over the raw body before parsing, with a constant-time compare and a replay window? | verify first, raw body, timestamp window, constant-time compare |
| multi-tenant query | change `org_id` in the URL and read another customer's data | does the handler take the tenant from the session, and does the query filter on it? | filter from session; negative test with another tenant's credential |
| mass assignment | add `"role": "admin"` to a profile update and it is persisted | is the request body bound to the model wholesale, or to an explicit field list? | explicit allow-list of writable fields per role |
| deserialization | a crafted payload becomes an object graph and runs code | does any untrusted byte stream reach `pickle`, `yaml.load`, `unserialize`, or a native deserializer? | JSON plus a schema; if not, signed payloads and a type allow-list |
| admin route | reach the admin handler directly because only the UI hides it | is authorization in the handler, or only in the front-end and the menu? | handler-level check plus a negative test; the UI is decoration |
| password reset | guess or replay a reset code, or reset another account's password | is the code random, single-use, expiring, and bound to the account? | 128-bit random, single-use, ≤ 15 minutes, constant-time compare, invalidate sessions on use |
| secrets in CI | a token in a workflow file, a log, or a PR from a fork | does the pipeline echo the secret, or expose it to fork-triggered jobs? | secret store at run time, masked, not exposed to `pull_request_target` |
| cache | a response cached without the tenant or `Authorization` in the key serves one user's data to the next | is the cache key the full identity of the response? | vary on identity, or do not cache authenticated responses |
| logging | a request body or header lands in a log sink with 30-day retention | is anything logged before redaction at the logger? | redact at the logger, drop bodies, keep a correlation id |

## Reading the table

Two rows apply to almost every review: the multi-tenant query and the webhook receiver. Both fail the
same way — the check exists at the route and not at the data, or the signature check runs after the
payload has already been parsed and trusted.

If a surface is not in this table, the finding is not invalid; the table is the catalogue of what has
been seen, not the boundary of what is possible. Write the row you needed.
