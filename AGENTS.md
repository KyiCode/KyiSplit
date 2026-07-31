# KyiSplit Agent Guide

## Instruction Sources

- This file defines repository-wide working rules.
- [`roadmap/PLANNING_GUIDE.md`](roadmap/PLANNING_GUIDE.md) defines roadmap
  structure and planning workflow.
- [`roadmap/README.md`](roadmap/README.md) defines release scope, product
  decisions, phase order, and phase status.
- The active phase `README.md` defines phase scope and exit criteria. Its
  `CURRENT_TASK.md` identifies the task whose file defines the task-specific
  acceptance criteria and verification.
- If these sources conflict, stop and tell the developer which statements
  conflict. Do not choose, merge, or edit the conflicting instructions; the
  developer resolves them manually.

## Before Work

- Inspect the relevant code and documentation before editing.
- Ask when missing information would materially change the solution.
- Preserve unrelated working-tree changes. Keep changes and commits scoped to
  one task.
- For roadmap planning or implementation, follow
  [`roadmap/PLANNING_GUIDE.md`](roadmap/PLANNING_GUIDE.md) and read
  [`roadmap/README.md`](roadmap/README.md).
- Before roadmap implementation, read the single phase marked `In progress`,
  its `CURRENT_TASK.md`, and the linked task file. If exactly one phase is not
  active, stop and inform the developer.

## Implementation

- Never commit secrets.
- Database schema changes are applied manually outside this repository. Keep
  [`roadmap/schema-reference.sql`](roadmap/schema-reference.sql) aligned with
  the schema the application expects; it is a reference, not a migration.
- Use TDD for behavioral changes: write a failing test, implement the smallest
  fix, then refactor.
- Keep frontend and backend API contracts aligned.

## Verification

Run the relevant checks before reporting completion:

```powershell
npm.cmd --prefix backend test
```

```powershell
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
```

Also run any phase-specific checks. Report commands that could not run and why.
