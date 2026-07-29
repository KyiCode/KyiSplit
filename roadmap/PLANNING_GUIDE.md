# KyiSplit Planning Guide

Use this guide when creating, revising, or implementing roadmap work.

## Instruction Ownership

- [`../AGENTS.md`](../AGENTS.md) defines repository-wide working rules.
- [`README.md`](README.md) defines release scope, product decisions, phase
  order, and phase status.
- A phase `README.md` defines that phase's outcome, scope, tasks, dependencies,
  and exit criteria.
- `CURRENT_TASK.md` identifies the task to implement. The linked task file
  defines its story points, acceptance criteria, and verification.
- `NOTES.md` contains non-authoritative handoff notes and deferred work.
- If any of these sources conflict, stop and tell the developer which
  statements conflict. Do not choose, merge, or edit the conflicting
  instructions; the developer resolves them manually.

## Roadmap Structure

```text
roadmap/
  README.md
  NOTES.md
  phaseXX-short-name/
    README.md
    CURRENT_TASK.md
    taskYY-short-name.md
```

- `roadmap/README.md` holds the release-level phase order and status.
- `roadmap/NOTES.md` holds brief handoff notes for the next planning pass,
  including deferred work. It must not override requirements elsewhere.
- `CURRENT_TASK.md` points to the next task to implement in that phase.
- A phase `README.md` defines its outcome, scope, tasks, dependencies, and exit
  criteria.
- Each task file defines its story points, acceptance criteria, and
  verification.

## Planning Scope

- Create or revise the release-level phase outline only when explicitly asked.
- Phases describe major outcomes from the current state through deployment.
  Their number and order may change as the project develops.
- Plan only one phase in detail per request. Do not create task plans for later
  phases.
- Carry unfinished work forward explicitly when planning the next phase.

## Task Sizing

- Use only the 1, 2, 3, and 5 point values.
- Limit each task to 5 points; split larger work before implementation.
- Story points measure complexity, uncertainty, and verification effort.
- Keep each task frontend-only or backend-only unless the work cannot be
  usefully separated.

## Progress

- Mark exactly one phase `In progress` in `roadmap/README.md` while roadmap
  implementation is underway. That row identifies the active phase.
- If roadmap implementation starts without exactly one active phase, stop and
  inform the developer.
- Keep implementation changes and commits scoped to one task.
- Mark a task `(done)` only after its acceptance criteria and verification pass.
- After a task passes, advance `CURRENT_TASK.md` to the next task.
- Update the phase status in `roadmap/README.md` only after all phase exit
  criteria pass.
- If implementation reveals extra work, split it into a new task or record it
  for a later phase.
