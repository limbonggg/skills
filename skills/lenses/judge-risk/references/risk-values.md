# Risk values

Floors, not targets. A finding cites one of these numbers and the finding is arguable; a finding that
says "weak" is not. Where the source column says **house**, the number is this repository's chosen
floor, not a standard — change it here and every skill that reads this table follows.

## Identity and sessions

| control | floor | source | what it decides |
|---|---|---|---|
| password hash | Argon2id, m=19456 KiB, t=2, p=1 | OWASP Password Storage | anything weaker is a `fix-before-merge` finding |
| password hash, fallback | scrypt N=2^17, r=8, p=1; bcrypt cost ≥ 12 | OWASP (bcrypt ≥ 10) + house | bcrypt below 12 is a finding; below 10 is a rejection |
| password length | 8 minimum, 64 maximum, no composition rules, no forced rotation, screened against a breach corpus | NIST SP 800-63B | composition rules and forced rotation are findings, not hardening |
| new-account minimum | 12 characters | house | a 10-character floor on a new system is a finding |
| access token lifetime | ≤ 15 minutes | house | a 24-hour access token is a finding |
| refresh token | rotate on every use, detect reuse, revoke the family; absolute ≤ 30 days, idle ≤ 7 days | RFC 9700 + house | an unrotated refresh token is a finding |
| session invalidation | on password change, privilege change, and logout-all | RFC 9700 | a token that survives a password reset is a finding |
| session cookie | `Secure; HttpOnly; SameSite=Lax` (`Strict` for admin), `__Host-` prefix, no `Domain` | house | a token readable by script is a rejection on a credentialed origin |
| auth attempt limit | 5 failures per account per 15 minutes; password reset 3 per hour per account | house | edge-only limiting is a finding |
| auth failure response | identical 401 for unknown user and wrong password | OWASP ASVS | a distinguishable error is an enumeration finding |
| JWT verification | pinned `alg`, `none` rejected, signature verified before any claim is read, clock skew ≤ 60 s | RFC 7519 + OWASP | `decode` without verification is a rejection |

## Secrets and data

| control | floor | source | what it decides |
|---|---|---|---|
| encryption at rest | AES-256-GCM or ChaCha20-Poly1305, unique nonce per message, never ECB | NIST SP 800-38D | a reused nonce is a finding; ECB is a rejection |
| transport | TLS 1.2 minimum, 1.3 preferred; HSTS `max-age=31536000; includeSubDomains` | OWASP HSTS | a 1.1 endpoint or missing HSTS on a public host is a finding |
| secret lifetime | static API key ≤ 90 days; database credential ≤ 24 hours or rotated ≤ 90 days; CI token per job | house | a permanent shared key is a finding |
| comparison | constant-time for tokens, MACs, and reset codes | house | `==` on an attacker-supplied token is a rejection |
| logging | never `Authorization`, `Cookie`, `Set-Cookie`, `X-Api-Key`, or keys matching `password\|secret\|token\|key\|credential`; bodies truncated at the logger | house | a body logged whole is a rejection |
| error bodies | no stack trace, SQL, internal hostname, or dependency version; a correlation id instead | OWASP ASVS | a stack trace to a client is a finding |
| secret history | assume a committed secret is compromised at commit time; rotate, then rewrite | house | "we deleted it" without rotation is a finding |

## Reach and egress

| control | floor | source | what it decides |
|---|---|---|---|
| SSRF refusal | link-local `169.254.0.0/16`, loopback, `10/8`, `172.16/12`, `192.168/16`, `::1`, `fc00::/7` refused at connect, after redirects | OWASP SSRF | a hostname allow-list checked before the request is a finding |
| outbound hosts | explicit allow-list resolved at connect time | house | a user-supplied absolute URL with no allow-list is a rejection |
| file upload | size cap 10 MiB default, magic-byte check not the declared type, random stored name, outside the webroot, never executed | OWASP File Upload | a stored original filename is a finding |
| inbound body | ≤ 1 MiB default, headers ≤ 8 KiB, request timeout ≤ 30 s | house | an unbounded body is a finding on a public route |
| CORS | explicit origin allow-list; never `*` with credentials; preflight cache ≤ 600 s | house | wildcard with credentials is a rejection |
| redirects | allow-list of destinations, no user-supplied absolute target | OWASP | an open redirect is a finding |
| rate limits | per principal *and* per address; edge limit alone is per-address | house | an account-scoped budget with no account counter is a finding |

## Blast radius tiers

| tier | one compromise reaches | containment the diff must name |
|---|---|---|
| T1 single user | that user's own rows and capabilities | none needed beyond authentication |
| T2 single tenant | every row of one tenant | a tenant filter taken from the session, plus a negative test |
| T3 all tenants | any row of any tenant | per-tenant key scope or row-level security, named |
| T4 infrastructure | credentials, deploy pipeline, network position | separate credential, scoped role, no shared admin key |
| T5 supply chain | every downstream install | pinned hash, reviewed install script, named upstream |

A finding's tier is the highest one its worst case reaches. T3 and above with "contained by nothing" is
`reject` or `redesign`, never `fix-before-merge`.

## Dependencies

| situation | verdict |
|---|---|
| reachable vulnerability, CVSS ≥ 7.0 | `fix-before-merge` |
| reachable vulnerability, CVSS 4.0–6.9 | `ship-with-conditions`: dated ticket, ≤ 30 days |
| vulnerability not reachable in this deployment | note in findings, no verdict change |
| unpinned range (`^`, `latest`, a branch) in an auth, crypto, or parser path | `fix-before-merge` |
| new package with no upstream repository, or no release in 12 months | `reject` |
| install script added by the diff | `fix-before-merge` until the script is read |

## Sources

OWASP Password Storage, SSRF Prevention, File Upload, HSTS, ASVS, and OAuth 2.0 cheat sheets; NIST SP
800-63B (digital identity) and SP 800-38D (GCM); RFC 7519 (JWT) and RFC 9700 (OAuth 2.0 Security BCP).
Consulted 2026-11. Where a standard and this table disagree, the standard wins and this table is the
bug.
