# Task 05 — Select the Managed Hosting Platform

- Story points: 2
- Area: Operations
- Status: Complete
- Dependencies: Task 04

## Goal

Record the managed Node.js hosting decision and the deployment contract before
provider-specific configuration is added.

## Acceptance Criteria

- A decision record compares viable hosts against HTTPS, Node.js support,
  Supabase connectivity, secret injection, health checks, log transport,
  immutable artifact promotion, and rollback.
- The selected region, runtime version, build/start commands, artifact storage,
  environment model, health-check behavior, and expected cost boundary are
  explicit.
- Production-like and production environments are separated without requiring
  separate source branches.
- Rejected options and material tradeoffs are recorded.
- No provider-specific configuration is introduced before the decision record.

## Verification

- Review the decision against every criterion above.
- Confirm the selected platform's current official documentation supports the
  recorded deployment contract before implementation begins.

## Verification Result

Verified on 2026-08-04:

- [`hosting-decision.md`](hosting-decision.md) compares Render and Railway
  against every acceptance criterion and records rejected alternatives.
- Render is selected with explicit Singapore region, Node.js 22 OCI runtime,
  GHCR digest artifact storage, CI build and Render start contracts, staging
  and production separation, readiness gate, rollback behavior, and cost cap.
- Current official Render and Railway documentation was reviewed and linked in
  the decision record.
- No provider-specific application or infrastructure configuration was added.
