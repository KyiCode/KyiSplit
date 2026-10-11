# Task 17 — Bound External Requests and Shutdown

- Story points: 5
- Area: Backend
- Status: Done
- Dependencies: Task 16

## Goal

Make stalled FX requests, readiness probes, and shutdown finish within explicit deadlines.

## Scope

FX service, database readiness checks, runtime shutdown, configuration, and backend tests.

## Acceptance Criteria

- Abort FX fetches after a bounded application timeout, including response-body consumption, and preserve FX_UNAVAILABLE responses.
- Allow at most one underlying readiness query at a time; concurrent probes share its outcome and callers still finish within their deadline.
- After a readiness timeout, do not start additional queries while the underlying query remains pending; recover after it settles.
- Define bounded shutdown behavior for active HTTP requests and pool draining, with forced termination after the grace period if needed.
- Release timers and listeners, make repeated shutdown calls safe, and preserve secret-safe lifecycle diagnostics.
- Cover a never-settling FX request, overlapping and stalled readiness probes, later readiness recovery, stalled HTTP connections, and stalled database shutdown.
- Do not claim Promise.race cancels a query; use driver-supported cancellation where available or explicitly bound outstanding work.

## TDD Sequence

Write failing timeout, overlap, recovery, and shutdown tests with injected clocks or controlled promises. Implement the deadlines and cleanup, then refactor.

## Verification

```powershell
npm.cmd --prefix backend test
```

## Completion

- FX provider requests use a configurable bounded timeout that aborts fetch and
  response-body reads while preserving the public `FX_UNAVAILABLE` error.
- Concurrent readiness callers share one pending query. Timed-out callers do
  not start replacement queries until the pending query settles.
- Shutdown shares one grace-period deadline across HTTP server closure and
  database pool draining, closes active connections at expiry, and forces a
  nonzero exit. Repeated calls share the same shutdown promise.
- Added bounded configuration and controlled timeout, stalled-query, recovery,
  socket, and pool-drain coverage.
- Verification passed: backend tests (208), frontend tests (64), frontend
  lint, frontend build, and `git diff --check`.

