# Phase 03 — Complete Product

## Objective

Deliver the complete browser workflow for trusted friends: create an account,
create or join a group, enter and correct expenses, see who owes whom, and
record repayments.

## Shared Frontend Foundation

- Add typed API request/response models matching the Phase 2 contract.
- Centralize fetch behavior, including credentials, JSON parsing, non-JSON
  failures, error envelopes, and unauthorized-session redirects.
- Remove legacy route aliases and unused API/component code after all pages use
  the new contract.
- Keep protected routes from flashing private content before session
  verification.
- Provide consistent loading, empty, validation, offline, unauthorized,
  not-found, and retryable-server-error states.

## Group and Invitation Workflow

- Add a required default-currency field to group creation, preselected to SGD.
- Display group name, currency, members, expenses, settlements, and balance
  summary from typed responses.
- Generate an invite whose API response contains the raw token and expiry
  metadata, not an environment-specific URL.
- Construct the shareable URL from `window.location.origin` and
  `/join/:token`.
- Show the exact one-hour expiry in the invite UI.
- Allow multiple different accounts to use the link until expiry. Existing
  members receive a clear non-destructive message.
- Preserve a pending invite through signup/login and return to it after
  authentication.

## Expense Workflow

- Keep multi-payer and custom-split entry with exact two-decimal validation.
- Preserve equal-split cent distribution so assigned amounts always equal the
  total.
- Add edit and delete actions. Editing replaces the expense, payments, and
  splits atomically; deleting requires explicit confirmation.
- Order expense history by expense date descending, then creation time
  descending.
- Display formatted group-member names and currencies rather than raw IDs.
- Refresh expenses and balances after every successful expense mutation.

## Balance and Repayment Workflow

- Add a group balance panel listing each suggested payer, receiver, amount, and
  group currency.
- Explain an empty balance as “everyone is settled” rather than an empty error
  state.
- Allow a suggestion to prefill a repayment form. The user may lower the amount
  for a partial repayment but may not enter zero, a negative value, another
  currency, or the same payer/receiver.
- Record the repayment, refresh suggestions, and add it to a chronological
  repayment history.
- Allow a mistaken repayment to be removed after confirmation, then recalculate
  balances.
- Show rate-provider failures as retryable without blocking expense history or
  group membership content.

## Accessibility and Responsive Behavior

- Ensure every input has a label and every icon-only control has an accessible
  name.
- Support keyboard navigation, focus restoration for modals, focus-visible
  styling, and Escape-to-close without losing unsaved data unexpectedly.
- Announce form errors and successful mutations to assistive technology.
- Verify layouts at narrow mobile, tablet, and desktop widths.
- Preserve reduced-motion behavior and adequate color contrast.

## Exit Criteria

- The complete signup-to-repayment journey works without database intervention.
- Editing/deleting expenses and recording/removing repayments immediately
  updates the displayed balance.
- Invitation behavior matches the reusable one-hour policy.
- Component tests cover validation and state transitions.
- Desktop and mobile end-to-end journeys pass.
- Frontend lint/build and backend tests/typecheck pass.
