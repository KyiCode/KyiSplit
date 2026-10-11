# Task 16 — Bound Rate Limiter Storage

- Story points: 3
- Area: Backend
- Status: Done
- Dependencies: Task 12

## Goal

Keep authentication throttling memory bounded during long-running service operation.

## Scope

Rate-limit middleware, runtime configuration if needed, and backend tests.

## Acceptance Criteria

- Evict expired entries during periodic request-driven cleanup and when storage reaches capacity, even when their client never sends another request.
- Enforce an explicit maximum number of stored client windows.
- Define deterministic behavior at capacity without silently dropping an active client's throttle state to admit a new client.
- Preserve existing attempt windows, response envelopes, Retry-After semantics, and proxy-derived client identity.
- Cover idle-client expiry, capacity rejection, retained active-client throttling, and cleanup lifecycle using controlled time. All acceptance cases pass.
- Document that limits remain per process; shared infrastructure is outside this task.

## TDD Sequence

Write failing expiry and capacity tests, implement bounded storage, then refactor cleanup and configuration.

## Verification

```powershell
npm.cmd --prefix backend test
```

