# Task 11 — Verify, Roll Back, and Promote the Release

- Story points: 5
- Area: Integration
- Status: Planned
- Dependencies: Tasks 08–10

## Goal

Prove the exact production artifact, operating controls, and rollback path
before promoting the private release.

## Acceptance Criteria

- The production-like database is backed up and verified compatible with
  `roadmap/schema-reference.sql` before application smoke tests.
- HTTPS and same-origin checks cover a direct browser route, static asset,
  authenticated API, unknown API route, secure cookie behavior, and health
  endpoints.
- The critical signup-through-repayment browser journey and highest-risk
  failure paths pass against production-like configuration without exposing
  sensitive test data.
- Monitoring and alerts receive a controlled signal, and rollback to the prior
  healthy artifact is executed and verified.
- The same checksummed artifact is redeployed after rollback, reverified, and
  promoted to production without rebuilding.
- Production smoke checks pass, evidence is sanitized, private users receive
  the onboarding guide, and Phase 04 exit criteria are reviewed before status
  changes.

## Verification

- Execute the release runbook against production-like and production.
- Record artifact checksum, check outcomes, rollback result, and promotion
  decision without credentials, cookies, invitation tokens, personal test
  data, or database connection values.
