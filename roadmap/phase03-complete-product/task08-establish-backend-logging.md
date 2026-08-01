# Task 08 — Establish Comprehensive Backend Logging

- Story points: 5
- Area: Backend
- Status: Done
- Dependencies: Task 07

## Goal

Make backend startup, request handling, database failures, and unexpected
process termination diagnosable without exposing secrets or changing public API
responses.

## Acceptance Criteria

- One centralized logger emits structured records with a timestamp, severity,
  event name, and safe contextual fields. Production output is machine-readable
  JSON, and local development remains easy to inspect.
- Log level is explicitly configured and validated. Invalid logging
  configuration fails startup with an actionable message.
- Every request receives a correlation ID. The ID is returned in a response
  header and included in request-start, request-completion, and request-failure
  records with method, matched route, status, and elapsed time.
- Authentication, group, invitation, expense, balance, FX, and repayment error
  paths log the failed operation and original error details at the appropriate
  level while preserving the existing safe client error envelope.
- PostgreSQL failures include safe diagnostic metadata such as error code,
  constraint, table, and operation. Connection strings, SQL parameter values,
  passwords, hashes, cookies, JWTs, authorization headers, invitation tokens,
  and request or response bodies are never logged.
- Startup records identify configuration validation, listener readiness, and
  database connectivity as distinct events. Shutdown signals and unexpected
  process-level failures are recorded, and exit behavior is deterministic.
- Existing ad hoc `console` calls and swallowed controller errors are replaced
  at mounted backend paths so a returned `INTERNAL_ERROR` always has a
  corresponding server-side diagnostic record.
- Tests use an injectable or captured log destination and prove level handling,
  correlation, request completion, database-error metadata, redaction, and
  unexpected-error behavior without emitting noisy test output.
- Backend documentation lists logging configuration, the correlation header,
  local troubleshooting steps, and the boundary between application logging
  and Phase 04 log transport, retention, monitoring, and alerting.

## TDD Sequence

1. Add failing logger, redaction, correlation-middleware, and lifecycle tests.
2. Add the smallest centralized logger and request-context middleware.
3. Replace swallowed errors and ad hoc console output one mounted backend path
   at a time, keeping public API contracts unchanged.
4. Add startup and process-lifecycle diagnostics, then verify that sensitive
   values cannot appear in captured records.
5. Document local diagnosis and refactor duplicate context only after the full
   backend suite passes.

## Verification

```powershell
npm.cmd --prefix backend test
```

Run the backend locally and confirm sanitized records exist for startup, one
successful request, one validation failure, and one controlled infrastructure
failure. Confirm the response correlation ID matches the related records and
that no credentials, cookies, tokens, request bodies, or database URLs appear.

## Verification Progress

- Backend type checking and all 165 tests pass.
- A controlled `EADDRINUSE` startup failure produced structured configuration,
  database-connectivity, startup-failure, and shutdown records with the real
  error code and no configured secrets.
- An isolated runtime check against the updated backend produced distinct
  configuration-validation, database-connectivity, listener-readiness, and
  deterministic-shutdown records.
- Successful and validation-failure requests returned the supplied
  `X-Request-Id` values and produced matching `request_started` and
  `request_completed` records with matched routes, statuses, and elapsed time.
- Captured startup and request records contained no credentials, cookies,
  tokens, request bodies, or database URLs.
