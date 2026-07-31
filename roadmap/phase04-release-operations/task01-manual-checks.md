# Task 01 Manual Accessibility Checks

This checklist records the checks that require a rendered browser. It contains
no credentials, cookies, invitation tokens, personal data, or database
secrets.

## Automated Evidence

- [x] Every critical form control exercised by component tests has a
  programmatic accessible name.
- [x] Error and loading behavior tests assert alert and status semantics.
- [x] Modal tests cover an accessible name, initial focus, forward and reverse
  focus containment, safe Escape behavior, and focus restoration.
- [x] Critical action tests exercise native button and link behavior from the
  keyboard-oriented testing library.
- [x] The responsive stylesheet includes phone-specific layouts for group,
  expense, balance, settlement, repayment, invite, auth, notices, dialogs, and
  the shared application header.

## Rendered Browser Checks

Run each check at 320 by 568 CSS pixels and again at a desktop viewport. Use
isolated non-production fixture data.

- [ ] Confirm `/auth` and `/signup` have no horizontal page overflow; Tab order
  follows email, password controls, submit, and the alternate-auth link.
- [ ] Confirm an anonymous `/join/<fixture-token>` page announces session
  loading and that all continuation actions have visible focus.
- [ ] Confirm the groups page, group creation form, and named currency dialog
  have no horizontal overflow; currency search receives initial focus and
  focus remains contained until close.
- [ ] Confirm the group activity, balance, settlement, repayment, invite, and
  member sections reflow without clipped text or horizontal page overflow.
- [ ] Confirm expense detail and both destructive confirmation dialogs trap
  focus, close with Escape only while safe, and restore focus to their opener.
- [ ] Confirm the expense-entry layout, member amount controls, review card,
  and currency dialog fit without horizontal page overflow.
- [ ] Confirm positive, negative, settled, complete, error, and integrity
  states remain understandable without relying on color alone.
- [ ] Confirm loading and error announcements are useful with a screen reader
  and do not move keyboard focus.

## Current Run

Manual browser checks are pending. On 2026-07-31 the browser runtime reported
that no in-app or Chrome browser backend was available. Task 01 cannot be
completed until the rendered checks above are completed and recorded.
