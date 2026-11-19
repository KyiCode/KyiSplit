# Task 35 - Experiment with Icons

- Story points: 2
- Area: Frontend
- Status: In progress
- Dependencies: Tasks 33 and 34

## Goal

Explore whether a small, consistent set of icons makes common actions and feedback easier to recognize.

## Acceptance Criteria

- Choose a limited set of representative actions or feedback states and compare the treatment with the existing interface. Record the decision and rationale.
- Keep meaningful text labels; decorative icons are hidden from assistive technology and any icon-only controls have accessible names. Check focus, contrast, touch targets, narrow layouts, and every shipped theme.
- Keep the experiment easy to remove. The icon experiment may be rolled back if it does not improve clarity or usability; document the result and retain the established text-based experience if rolled back.

## Verification

Use TDD for behavioral changes. Run `npm.cmd --prefix frontend test`, `npm.cmd --prefix frontend run lint`, `npm.cmd --prefix frontend run build`, and the repository-required backend test. Record representative visual and keyboard review outcomes and any unavailable checks.

## Implementation Record - 2026-11-19

- Added a small inline SVG treatment to Add expense, Invite people, and Start a new group. Text labels remain visible; the SVGs are hidden from assistive technology and use `currentColor`. The treatment adds no external icon dependency and is easy to remove.
- Automated frontend tests, lint, build, and backend tests passed. Visual, keyboard, narrow-layout, and theme-by-theme manual review remains open because the browser-control host is unavailable.
