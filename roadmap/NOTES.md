# Roadmap Notes

These notes are non-authoritative planning handoff context. Requirements and
status remain owned by `roadmap/README.md`, the active phase `README.md`,
`CURRENT_TASK.md`, and the linked task file.

## 2026-07-31 Planning Handoff

- The four-phase private-release outline now covers stabilization, data/API
  foundations, product completion, and release operations.
- Phase 01 is complete. Phase 02 is planned and is the single active phase.
- Phase 02 begins with the carried-forward interactive browser regression, then
  builds its API and migration work on the verified Phase 01 security and
  transaction invariants.
- A deployment provider is intentionally not selected yet. Phase 04 must record
  that decision before provider-specific files are introduced.

## Deferred to Later Phases

- Versioned migrations, schema constraints, and the SGD group-currency backfill
  belong to Phase 02.
- Persisted FX inputs, deterministic settlement calculations, and the repayment
  data model belong to Phase 02.
- Full balance, settlement, and repayment browser experiences plus frontend and
  end-to-end test suites belong to Phase 03.
- Same-origin packaging, CI/CD, production deployment, observability, backup,
  and rollback work belong to Phase 04.

## 2026-07-31 Implementation Handoff

- All Phase 01 tasks are complete.
- At the developer's direction, the interactive browser regression was moved
  from Phase 01 Task 05 to Phase 02. Phase 02 must run it before changing the
  stabilized Phase 01 contracts.
- Backend verification passes 110 tests across 14 files.
- A production dependency audit fix updated the backend lockfile and reported
  zero remaining vulnerabilities.
- A temporary compiled backend reached Supabase with explicit network
  permission and returned the expected generic `401` for a nonexistent account.
  No test records were inserted.

## 2026-07-31 Phase 02 Planning Handoff

- Phase 02 is decomposed into nine ordered tasks totaling 40 points.
- Its current task is the carried-forward Phase 01 browser regression. Contract
  or schema implementation must not begin until that regression passes.
- The plan treats settlement suggestions as deterministic derived output and
  repayments as the persisted ledger records that reduce balances.
- Legacy groups are backfilled to SGD. Legacy expense FX values are captured
  once at the Phase 02 cutover because an earlier historical rate cannot be
  reconstructed from the current schema.

## 2026-07-31 Phase 03 Planning Handoff

- Phase 02 is complete with 161 backend tests, 13 isolated database tests,
  frontend lint, and frontend build passing.
- The developer directed that the interactive Phase 02 browser regression be
  treated as passed; Codex did not independently control that browser run.
- Phase 03 is decomposed into ten ordered tasks totaling 40 points.
- Expense correction is explicitly delete and recreate. Settlement
  suggestions remain derived, and repayment recording always requires an
  explicit user action.

## 2026-10-14 Local Review Planning Handoff

- Phase 04 remains the single active phase. Tasks 22–32 add an ordered,
  26-point follow-up before the remaining Task 07 release verification.
- The prior review passed 232 backend tests, 69 frontend tests, frontend lint,
  backend/frontend builds, and a synthetic local API journey. Live schema
  compatibility and isolated browser E2E checks failed. These are prior review
  results, not verification of the newly planned tasks.
- The local/prod profile implementation and ignored local demo database already
  exist; Task 22 validates that work. The hosted connection was rejected by
  Supabase during the review and requires current external configuration for
  the production-like environment. Do not record its credentials here.
- Reference-schema catalog rejection and insufficient browser startup
  diagnostics are reproduced gaps. The E2E failure's exact stage remains to be
  diagnosed; do not label its cause without evidence.
- Keep larger product changes deferred: in-place expense editing and audit
  history, self-service password recovery, individual session revocation, new
  signup/access controls, schema-backed request idempotency, pagination, and
  group-query batching. These require separate scope/product decisions; editing
  would replace the existing delete-and-recreate correction policy.
- Existing Tasks 09 and 10 own operational recovery and private onboarding.
  Task 10 now calls for an accurate maintainer-assisted recovery/access procedure
  and explicit documentation of current session and deployed-access limits.

## 2026-10-21 Task 32 Review Handoff

- The complete isolated Chromium suite passed twice after the final Task 32 E2E
  changes. Backend tests passed 279 tests across 28 files; frontend tests passed
  88 tests across 16 files. Backend build, frontend lint, and frontend build
  passed.
- The explicit disposable PostgreSQL schema gate passed. The release artifact
  audit found no local profiles, browser state, demo credentials, or application
  database target.
- Added browser coverage for local date defaults, stale-balance recovery,
  expense ordering, clipboard failure, narrow layout, long names and amounts,
  loading announcements, and keyboard focus visibility.
- TDD caught and fixed rejection of large decimal amounts caused by floating
  point tolerance. The browser journey also now waits for asynchronous sign-in
  navigation and follows the app's automatic navigation after group creation.
- Manual desktop, zoom, contrast, and assistive-technology review remains
  unresolved because no browser was available through computer control. These
  checks have not been claimed as passed; Task 32 remains active and Task 07
  has not resumed.
