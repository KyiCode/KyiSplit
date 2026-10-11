# Task 14 — Reject Truncated Signup Passwords

- Story points: 3
- Area: Backend
- Status: Done
- Dependencies: Task 12

## Goal

Ensure every byte of a newly registered password contributes to its bcrypt hash.

## Scope

Backend credential validation, signup handling, and authentication regression tests.

## Acceptance Criteria

- Reject signup passwords exceeding 72 UTF-8 bytes before hashing or database writes. The shared API contract publishes this limit.
- Keep the existing minimum length and email rules; use byte length rather than JavaScript character count for the bcrypt maximum.
- Keep login compatible with previously accepted passwords, including passwords longer than 72 bytes within the existing login limits.
- Return the established validation error envelope with an actionable signup message; do not change password hashing or require account resets.
- Cover exactly 72 bytes, 73 bytes, multibyte input, and existing login compatibility. All acceptance cases pass.

## TDD Sequence

Write failing signup boundary and login compatibility tests, implement signup-specific validation, then refactor without tightening the legacy login limit.

## Verification

```powershell
npm.cmd --prefix backend test
```

