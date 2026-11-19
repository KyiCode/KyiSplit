# Task 34 - Evaluate Light and Dark Themes

- Story points: 5
- Area: Frontend
- Status: In progress
- Dependencies: Task 33

## Goal

Assess whether a light/dark theme choice improves readability and usability, and implement it only if the evaluation supports it.

## Acceptance Criteria

- Review representative screens and feedback in light and dark treatments, including contrast, focus indicators, form controls, and narrow layouts. Record the decision and reasons, including if a toggle is deferred.
- If a toggle is adopted, make it available on authenticated and unauthenticated screens, keyboard operable and clearly labelled. Define and test the default, system-preference behavior, persistence, and behavior if storage is unavailable.
- Apply consistent theme tokens to surfaces, text, feedback, controls, and browser color scheme; avoid unreadable hard-coded colors and noticeable incorrect-theme flashes. Both themes retain the existing accessibility baseline.
- Recheck Task 33 feedback and representative Task 32 browser review states in every shipped theme, including zoom, contrast and focus visibility.

## Verification

Use TDD for behavioral changes, including preference and persistence behavior if implemented. Run `npm.cmd --prefix frontend test`, `npm.cmd --prefix frontend run lint`, `npm.cmd --prefix frontend run build`, and the repository-required backend test. Record manual visual, keyboard, and assistive-technology outcomes and any unavailable checks.

## Implementation Record - 2026-11-19

- Adopted a System/Light/Dark preference control on authenticated and unauthenticated screens. System follows `prefers-color-scheme`; explicit choices and System are persisted under `kyisplit-theme`. A pre-paint script applies the saved or system theme, and unavailable storage falls back to an in-memory selection.
- Shared tokens cover page and panel surfaces, text, borders, inputs, feedback, skeletons, overlays, focus color, and browser color scheme/theme color.
- Representative light-theme contrast: body text 15.64:1, muted text 6.44:1, error feedback 7.83:1, success feedback 6.68:1, and focus/accent 5.94:1. Representative dark-theme body text is 17.61:1, muted text 6.82:1, and accent/focus 9.07:1.
- Automated preference tests cover explicit selection, reload persistence, system changes, and unavailable storage. Frontend tests, lint, build, and backend tests passed. Fresh desktop/mobile visual, 200% zoom, keyboard, and assistive-technology checks remain unavailable because browser control could not connect.
