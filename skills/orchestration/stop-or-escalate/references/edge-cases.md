# Edge cases — which stop is this

Read this when a case does not obviously pass one admission test. Each row is a situation a run
actually reaches, the stop it is, and the reason the adjacent stop is wrong. The `no stop` rows matter
as much as the rest: they are the default verdict, and the ones an agent gets wrong when it is tired.

| situation | stop | why |
|---|---|---|
| The sentinel ran and matched, at the same moment the spend cap was crossed | `done` | The sentinel was observed and no work remains. The budget stop is about work that would still need doing. |
| The sentinel passed but a unit's own check failed | `wrong` | The completion criterion no longer measures the work. The contradiction between the two checks is the finding, and the next run must not trust the sentinel until it is repaired. |
| Spend reads $20.30 against a $20 cap, six units left | `out-of-budget` | The reading crossed a written cap. `remains` lists the six, and `resume` is the first of them. |
| Spend reads $19.60 of $20; six units remain at a measured $0.40 each, and the envelope wrote a projection rule | `out-of-budget` | The written rule fired: $19.60 + 6 × $0.40 is past the cap, and spend is already past half of it. The arithmetic is the observation; the ask is the cap, not the work. |
| The same reading, and no projection rule was written down | `blocked` | With no written rule the remainder cannot fit and nothing was crossed. Raising the cap is not the run's decision. |
| The remainder does not fit the cap, but a cheaper path to the sentinel exists | `no stop` | Take the cheaper path and recompute from it. A rule never evaluated against the route you are about to take has not fired. |
| The human named a wall-clock deadline and it arrived | `out-of-budget` | A deadline is a written cap with a clock on it. |
| Iterations or context are nearly exhausted and no cap was written | `blocked` | With no written cap there is nothing to cross. The ask is the human's decision about what to drop. |
| A worker returned `BLOCKED` on a test dependency it can install itself | `no stop` | Inside the envelope. This is a worker failure: retry with the install step, then skip per the loop's table. |
| A worker returned `BLOCKED` on a staging credential | `blocked` | Credentials are forbidden; the envelope edge is nameable. Adopting the worker's label happens to be right here, which is why it is tempting everywhere else. |
| A worker ended with "should I use the v1 or v2 endpoint? I'll wait." | `blocked` | A parked question is a stop without a record. Either answer it from the envelope and continue, or record it with the question as `fired_on`. |
| Unit 7's check fails because `tests/fixtures/users.json` is missing; repo writes are allowed | `no stop` | Write the fixture from the schema and rerun. `blocked` requires an edge, and there is none here. |
| The upstream artifact does not exist and another team owns producing it | `blocked` | The dependency is outside the envelope and outside the run's reach. |
| The upstream artifact exists but its shape differs from what the plan assumed | `wrong` | The units change because of it: the delta is nameable, which is what makes this invalidation rather than inconvenience. |
| The plan assumed idempotency; the endpoint double-charges on retry | `wrong` | Continuing executes a plan that is now known to be harmful. The delta is every remaining unit that retries. |
| The sentinel is redefined mid-run to match what the run produced | `wrong` | The completion criterion moved. A run that reaches a moved sentinel has proved nothing about the goal it started with. |
| Three consecutive skips, three unrelated causes | `wrong` | The pattern says the units cannot be done as specified. Three independent failures are evidence about the plan. |
| Three consecutive skips, one shared dependency | `blocked` | One dependency explains all three; the skip threshold was a symptom, not the finding. |
| A forbidden command is the only way forward | `blocked` | The edge is named and the ask is the approval. Never widen the envelope to avoid the stop. |
| A required service is down; the documented recovery window is inside the remaining wall clock | `no stop` | A wait the run can afford is a retry, not a stop. Outside that window it is `blocked` on the service. |
| One test failed and it has not been re-run | `no stop` | First failure is a retry with new information. Stopping on it makes every flaky suite terminal. |
| Half the plan is done and a better design appeared | `no stop` | A revision inside the envelope. Record it and continue; `wrong` needs the plan invalidated, not improved. |
| The run finished, and the human says the artifact is not what they asked for | `wrong` | The definition of done was accepted against the wrong goal. Discovered late, it is still a framing failure, and the record should say so rather than claim `done`. |

Two habits this table encodes. First, the stop that passes a test wins even when another stop is also
true — `done` and a crossed cap can both be true, and the record says `done` because nothing remains.
Second, the condition that fired *first* is the stop; a later condition does not relabel an earlier
one, or a dead plan gets charged to the budget.
