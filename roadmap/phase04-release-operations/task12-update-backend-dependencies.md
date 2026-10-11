# Task 12 — Update Backend Dependencies

- Story points: 2
- Area: Backend
- Status: Done
- Dependencies: Task 06

## Goal

Reduce audited dependency risk in the API and its development tools.

## Scope

backend/package.json and backend/package-lock.json, with backend compatibility fixes only.

## Acceptance Criteria

- Run full and production-only dependency audits and distinguish affected code paths from advisory severity labels.
- Apply compatible fixes using a reviewed lockfile update; inspect major-version or downgrade suggestions individually. Nodemon and its unpatched `braces` chain were removed, and the existing `tsx` watcher now runs the development server.
- Keep the Express proxy trust, authentication, API, and packaging contracts intact.
- Record remaining findings with affected dependency paths and applicability; do not claim all findings are fixed unless the final audits show that. Both final backend audits report zero findings.

## Verification

```powershell
npm.cmd --prefix backend test
npm.cmd --prefix backend audit
npm.cmd --prefix backend audit --omit=dev
```

Inspect audit results even when the audit command exits nonzero. Verification uses no application database.

