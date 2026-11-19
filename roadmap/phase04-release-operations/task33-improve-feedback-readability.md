# Task 33 - Improve Feedback Readability

- Story points: 3
- Area: Frontend
- Status: In progress
- Dependencies: Tasks 32 and 07

## Goal

Make user-facing feedback easy to find, read, and act on throughout the app.

## Acceptance Criteria

- Inventory representative validation, error, success, loading, and stale-data messages across authentication, groups, expenses, balances, and repayments. Document concrete readability problems before changing the shared treatment.
- Improve text size, line height, spacing, contrast, wrapping, and placement as needed; keep messages understandable without relying on color. Make recovery actions and the outcome of an operation clear where applicable.
- Preserve existing alert/status announcements, field associations, focus, and confirmed-save recovery behavior. Check narrow screens, long messages, and 200% zoom without clipping or horizontal overflow.
- Check text contrast against its actual background (at least 4.5:1 for normal text and 3:1 for large text), including interactive states; record results.

## Verification

Use TDD for behavior changes. Run `npm.cmd --prefix frontend test`, `npm.cmd --prefix frontend run lint`, and `npm.cmd --prefix frontend run build`; run the repository-required backend test. Review representative feedback in a browser with keyboard and assistive technology and record any unavailable checks rather than claiming they passed.

## Implementation Record - 2026-11-19

- Inventory covered authentication validation/errors, group list and creation states, expense validation, balance loading/stale/error messages, and repayment feedback. The shared small notice treatment used 0.78rem text, 11px vertical padding, and no explicit line-height or wrapping behavior; long messages and recovery actions could become cramped on narrow screens.
- Notices now use larger text, 1.5 line-height, more spacing, safe wrapping, flexible message width, and 44px minimum action targets. Existing alert and status roles and operation recovery behavior are unchanged.
- Contrast checks for representative default and light-theme feedback passed: dark error 11.16:1, dark success 12.18:1, light error 7.83:1, and light success 6.68:1. Text and recovery actions remain explicit and do not rely on color alone.
- Automated frontend tests, lint, build, and backend tests passed. Manual narrow-screen, 200% zoom, keyboard, and assistive-technology review remains unavailable because the browser-control host is unavailable.
