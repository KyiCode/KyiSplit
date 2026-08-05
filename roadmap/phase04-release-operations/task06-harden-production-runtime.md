# Task 06 — Harden the Production Runtime

- Story points: 5
- Area: Backend
- Status: Done
- Dependencies: Task 05

## Goal

Make startup, database usage, authentication exposure, and health signaling
safe and diagnosable on the selected managed runtime.

## Acceptance Criteria

- Production configuration validates HTTPS origin, proxy assumptions, runtime
  version, secret presence, bcrypt cost, request-size limits, and bounded
  PostgreSQL pool settings before listening.
- Login and signup have explicit abuse controls that behave correctly behind
  the selected host's trusted proxy boundary.
- Liveness reports process availability without querying dependencies;
  readiness checks database availability with a bounded timeout and returns no
  sensitive detail.
- Startup, shutdown, readiness failure, and pool exhaustion have structured,
  secret-safe diagnostics.
- Automated tests cover invalid configuration, throttling boundaries, proxy
  identity, health responses, readiness failure, and graceful shutdown.

## TDD Sequence

1. Add failing configuration, abuse-control, and health endpoint tests.
2. Implement the smallest production runtime controls.
3. Refactor configuration and lifecycle code while preserving contracts.

## Verification

```powershell
npm.cmd --prefix backend test
npm.cmd --prefix frontend run test:e2e
```
