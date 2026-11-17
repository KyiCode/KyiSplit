# Task 34 — Evaluate Light and Dark Themes

- Story points: 5
- Area: Frontend
- Status: Planned
- Dependencies: Task 33

## Goal

Assess whether a light/dark theme choice improves readability and usability,
and implement it only if the evaluation supports it.

## Acceptance Criteria

- Review representative screens and feedback in light and dark treatments,
  including contrast, focus indicators, form controls, and narrow layouts.
  Record the decision and reasons, including if a toggle is deferred.
- If a toggle is adopted, make it available on authenticated and unauthenticated
  screens, keyboard operable and clearly labelled. Define and test the default,
  system-preference behavior, persistence, and behavior if storage is unavailable.
- Apply consistent theme tokens to surfaces, text, feedback, controls, and browser
  color scheme; avoid unreadable hard-coded colors and noticeable incorrect-theme
  flashes. Both themes retain the existing accessibility baseline.
- Recheck Task 33 feedback and representative Task 32 browser review states in
  every shipped theme, including zoom, contrast and focus visibility.

## Verification

Use TDD for behavioral changes, including preference and persistence behavior
if implemented. Run `npm.cmd --prefix frontend test`,
`npm.cmd --prefix frontend run lint`, `npm.cmd --prefix frontend run build`, and
the repository-required backend test. Record manual visual, keyboard, and
assistive-technology outcomes and any unavailable checks.
