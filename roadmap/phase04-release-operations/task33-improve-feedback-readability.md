# Task 33 — Improve Feedback Readability

- Story points: 3
- Area: Frontend
- Status: Planned
- Dependencies: Tasks 32 and 07

## Goal

Make user-facing feedback easy to find, read, and act on throughout the app.

## Acceptance Criteria

- Inventory representative validation, error, success, loading, and stale-data
  messages across authentication, groups, expenses, balances, and repayments.
  Document concrete readability problems before changing the shared treatment.
- Improve text size, line height, spacing, contrast, wrapping, and placement as
  needed; keep messages understandable without relying on color. Make recovery
  actions and the outcome of an operation clear where applicable.
- Preserve existing alert/status announcements, field associations, focus,
  and confirmed-save recovery behavior. Check narrow screens, long messages,
  and 200% zoom without clipping or horizontal overflow.
- Check text contrast against its actual background (at least 4.5:1 for normal
  text and 3:1 for large text), including interactive states; record results.

## Verification

Use TDD for behavior changes. Run `npm.cmd --prefix frontend test`,
`npm.cmd --prefix frontend run lint`, and `npm.cmd --prefix frontend run build`;
run the repository-required backend test. Review representative feedback in a
browser with keyboard and assistive technology and record any unavailable
checks rather than claiming they passed.
