# Task 31 — Return a Validation Error for Malformed JSON

- Story points: 1
- Area: Backend
- Status: Done
- Dependencies: Task 30

## Goal

Treat invalid request JSON as a client error rather than an internal server failure.

## Acceptance Criteria

- Reproduce the observed malformed-JSON POST returning 500 using a request-level regression.
- Map the recognized parser syntax failure to 400 and the established VALIDATION_ERROR envelope; retain the 413 oversized-body behavior.
- Preserve generic 500 handling for unrelated internal errors and headers-already-sent behavior.
- Keep malformed body contents, credential fields, and raw parser errors out of responses and retained logs.

## TDD Sequence

Write failing malformed-body, oversized-body, and unrelated-error checks; implement a narrow parser-error branch, then refactor.

## Verification

```powershell
npm.cmd --prefix backend test
npm.cmd --prefix backend run build
```

Backend tests and build; real local malformed-JSON request returning 400 with a sanitized response.

## Completion

- Recognized Express JSON parser syntax failures now return HTTP 400 with the
  established `VALIDATION_ERROR` envelope. The response uses a fixed message,
  and the rejection log omits parser details and request contents.
- Oversized bodies still return HTTP 413. Unrelated errors retain the generic
  HTTP 500 response and are passed to Express when headers have already been
  sent.
- Request-level regressions cover malformed and oversized JSON; handler tests
  cover generic errors and sent headers.
- Verification passed: `npm.cmd --prefix backend test` (275 tests),
  `npm.cmd --prefix backend run build`, `npm.cmd --prefix frontend run lint`,
  and `npm.cmd --prefix frontend run build`. The local HTTP request regression
  confirms malformed JSON returns a sanitized 400 response.
