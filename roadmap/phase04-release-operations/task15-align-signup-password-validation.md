# Task 15 — Align Signup Password Validation

- Story points: 1
- Area: Frontend
- Status: Done
- Dependencies: Task 14

## Goal

Explain the signup password limit before sending an invalid request.

## Scope

Signup screen and its frontend tests.

## Acceptance Criteria

- Measure UTF-8 byte length using the shared API limit and prevent signup submission above 72 bytes.
- Show accessible guidance explaining that some characters use multiple bytes and associate it with the password field. Over-limit input receives an announced error.
- Keep entered values after rejection and preserve pending invitation continuation.
- Keep login behavior compatible with existing accounts.
- Cover ASCII and multibyte boundaries and verify oversized input makes no signup request. All acceptance cases pass.

## TDD Sequence

Write failing signup boundary tests, implement the validation and guidance, then refactor.

## Verification

```powershell
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
```

