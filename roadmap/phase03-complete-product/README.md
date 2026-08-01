# Phase 03 — Complete Product

## Outcome

The private-group browser journey is complete from account creation through
group setup, invitation, multi-payer expenses, deterministic balances,
settlement suggestions, and recorded repayments. Frontend behavior and the
backend diagnostic paths are protected by automated tests.

## Why This Phase Comes Next

Phase 02 made the database and API authoritative, but the browser still exposes
only the original partial experience:

- Expense cards do not expose full payer/split detail or authorized deletion.
- Deterministic balances and settlement suggestions have no browser view.
- Repayments have API routes but no creation, history, or correction UI.
- Group currency is displayed but is not used to streamline expense entry.
- Loading, offline, unauthorized, expired-link, and retry behavior exists
  unevenly and has no frontend automated suite.
- Backend startup and controller failures are logged inconsistently, and some
  `INTERNAL_ERROR` responses discard the original exception entirely.

## Scope

- Add a frontend unit/component test foundation and use it for all new browser
  behavior.
- Complete the authorized expense-deletion contract and browser workflow.
- Add typed browser clients for balance, repayment, and expense-management
  endpoints.
- Present expense detail, deterministic member balances, settlement
  suggestions, repayment history, recording, and deletion.
- Finish group-currency defaults and the existing authentication, invitation,
  group, and expense form recovery states.
- Add structured, correlated, secret-safe backend diagnostics for startup,
  requests, database failures, and unexpected termination.

## Out of Scope

- Editing an expense graph in place; correction is delete and recreate.
- Persisting settlement suggestions or automatically creating repayments from
  them.
- Member removal, account deletion, roles, public groups, or invite
  administration.
- Responsive accessibility verification, deterministic end-to-end
  infrastructure, and critical-journey browser verification, which move to
  Phase 04.
- Same-origin production packaging, deployment, CI/CD, log aggregation and
  retention, monitoring, backups, and operational rollback, which remain
  Phase 04.
- Provider-specific hosting files or production secret configuration.

## Product and Interaction Rules

- Any current group member may invite, add or delete expenses, and create or
  delete repayments for that group.
- Expense deletion requires a deliberate confirmation and refreshes balances
  and activity without exposing cross-group existence.
- Balance signs retain the Phase 02 contract: positive means the member should
  receive; negative means the member owes.
- Repayments are entered and displayed only in the group default currency.
- Settlement suggestions remain derived. Recording a repayment is always an
  explicit user action.
- Forms keep entered values after a recoverable API or network failure.

## Dependencies

- Phase 02 is complete and its automated checks pass.
- The developer-supplied Phase 02 browser regression is recorded.
- The shared API contract, expected schema reference, deterministic balance
  response, and repayment routes from Phase 02 remain authoritative. The
  database owner applies schema changes manually.

## Tasks

Tasks are implemented in order. Each task is independently testable and is
marked `(done)` only after its acceptance criteria and verification pass.

| Task | Area | Points | Outcome |
| --- | --- | ---: | --- |
| [01 — Establish frontend behavior tests](task01-establish-frontend-tests.md) (done) | Frontend | 5 | React behavior has a deterministic unit/component test foundation |
| [02 — Complete expense management API](task02-complete-expense-management-api.md) (done) | Backend | 3 | Authorized members can safely delete an expense graph |
| [03 — Complete the product API client](task03-complete-product-api-client.md) (done) | Frontend | 3 | Balance, repayment, and expense-management clients consume shared contracts |
| [04 — Complete expense activity and management](task04-complete-expense-activity-management.md) (done) | Frontend | 5 | Group activity presents details and supports confirmed deletion |
| [05 — Present balances and settlements](task05-present-balances-settlements.md) (done) | Frontend | 5 | Members can understand deterministic balances and suggestions |
| [06 — Complete the repayment experience](task06-complete-repayment-experience.md) (done) | Frontend | 5 | Members can record, review, and correct repayments |
| [07 — Harden the core browser journeys](task07-harden-core-browser-journeys.md) (done) | Frontend | 3 | Auth, invite, group, currency, and expense journeys recover predictably |
| [08 — Establish comprehensive backend logging](task08-establish-backend-logging.md) (done) | Backend | 5 | Failures are correlated and diagnosable without exposing secrets |

Total: 34 points.

## Exit Criteria

- Frontend component tests cover success, validation, loading, empty,
  unauthorized, expired-link, network failure, retry, and destructive
  confirmation behavior for the completed journeys.
- A current member can create a currency-aware group, invite multiple members,
  add a multi-payer expense, inspect balances, follow settlement suggestions,
  record a repayment, and see balances update.
- Expense and repayment deletion are group-scoped, confirmed in the browser,
  and covered at controller and component boundaries.
- Balance and repayment screens use the group currency returned by the API and
  never infer or fetch a target rate.
- Every backend `INTERNAL_ERROR` response has a correlated, structured
  diagnostic record, while automated redaction checks prove secrets and
  sensitive request data are excluded.
- Backend tests, frontend tests, frontend lint, and frontend build all pass.

## Phase Verification

```powershell
npm.cmd --prefix backend test
```

```powershell
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
```
