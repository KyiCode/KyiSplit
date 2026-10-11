# Task 13 — Update Frontend Dependencies

- Story points: 2
- Area: Frontend
- Status: Done
- Dependencies: Task 12

## Goal

Reduce audited dependency risk in browser routing and frontend tooling.

## Scope

frontend/package.json and frontend/package-lock.json, with frontend compatibility fixes only.

## Acceptance Criteria

- Run full and production-only audits and review which advisories apply to the browser application or development tools.
- Apply compatible fixes with a reviewed lockfile update and no automatic forced major upgrades. Audit fixes updated React Router, Vite, Vitest, and affected transitive packages within declared version ranges.
- Keep browser navigation, API client behavior, and the existing build contract intact.
- Record any remaining findings and their applicability after the final audit. Both final frontend audits report zero findings.

## Verification

```powershell
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
npm.cmd --prefix frontend audit
npm.cmd --prefix frontend audit --omit=dev
```

Inspect audit results even when the audit command exits nonzero.

