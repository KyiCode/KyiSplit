# Task 01 — Meet the Responsive Accessibility Baseline

- Story points: 3
- Area: Frontend
- Status: Complete
- Dependencies: Phase 03

## Goal

Make every completed private-release screen keyboard-usable, meaningfully
announced, and resilient across phone and desktop layouts.

## Acceptance Criteria

- Forms have programmatic labels, errors are associated with fields or
  announced in status/alert regions, and loading states are announced without
  stealing focus.
- Dialogs have names, initial focus, focus containment, Escape close when safe,
  and focus restoration.
- All actions are keyboard reachable with visible focus and valid button/link
  semantics.
- Heading order, landmarks, list semantics, and color-independent status cues
  are coherent.
- Group, expense, balance, settlement, repayment, invite, and auth layouts work
  at 320 CSS pixels without horizontal page overflow.
- Automated accessibility assertions and focused component tests cover the
  critical screens.

## TDD Sequence

1. Add failing semantic, focus, and narrow-viewport tests.
2. Correct shared primitives before page-specific defects.
3. Run the complete automated frontend verification.

## Verification

```powershell
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
```
