# Recommended KyiSplit improvements

KyiSplit should first make its existing accounting visible and its save outcomes reliable. Broader Splitwise parity would add work outside the current private-release scope. The later opportunities below are proposals for subsequent planning, not changes to the authoritative roadmap.

## Current foundations to preserve

- [Expense creation](../backend/src/controllers/expenseController.ts) writes the expense, FX snapshot, payments, and splits transactionally.
- [Balance calculation](../backend/src/utils/balanceServices.ts) uses integer minor units, decimal rate ratios, deterministic allocation, and stored FX inputs. Its read path uses a repeatable-read transaction.
- [RepaymentPanel](../frontend/src/components/RepaymentPanel.tsx) supports explicit recording and deletion of repayments. [BalancePanel](../frontend/src/components/BalancePanel.tsx) labels suggestions as calculated rather than recorded.
- The frontend imports shared [API types](../backend/src/contracts/api.ts), keeping contracts visible across both projects.

The greedy settlement routine produces deterministic valid payment paths. Do not describe it as proven to produce the globally smallest possible number of payments.

## Immediate work already planned

Keep the existing sequence in [Phase 04](../roadmap/phase04-release-operations/README.md). The rows below explain relevance to this research, rather than establishing a new order.

| Existing task | Observed implementation evidence | User benefit |
| --- | --- | --- |
| [25 Group creation recovery](../roadmap/phase04-release-operations/task25-recover-group-creation-refresh.md) | `MainPage.handleAddGroup` catches both create and subsequent list refresh failure as creation failure. | A confirmed save remains successful when refreshing the list fails. |
| [26 Local expense date](../roadmap/phase04-release-operations/task26-use-local-calendar-date.md) | `AddExpensePage` initializes a module-level date through `toISOString()`, using UTC and retaining the initial module date. | The form opens on the user's current local calendar date. |
| [27 Detail API](../roadmap/phase04-release-operations/task27-expose-expense-breakdown-api.md) and [28 Detail dialog](../roadmap/phase04-release-operations/task28-show-expense-breakdown.md) | The expense summary contract omits payer contributions, shares, and FX. `GroupPage` displays original amount and date only. | Members can inspect the saved facts behind balances, including multiple payers and cross-currency expenses. |
| [29 Refresh and delete focus](../roadmap/phase04-release-operations/task29-clarify-balance-refresh-and-delete-focus.md) | Retained balance data can remain visible during refresh; the expense confirmation autofocuses its destructive action. | Members can recognize stale values and use keyboard confirmation deliberately. |
| [30 Activity ordering](../roadmap/phase04-release-operations/task30-order-expense-activity.md) | `queries.getExpenses` selects by group without `ORDER BY`. | Recent activity has a stable, meaningful order. |
| [31 Malformed JSON](../roadmap/phase04-release-operations/task31-reject-malformed-json.md) and [32 Browser review](../roadmap/phase04-release-operations/task32-rerun-private-release-browser-review.md) | These are existing release follow-up tasks. | Finish client error handling and obtain browser evidence for the resulting journey. |

Tasks 27 and 28 should expose the persisted rate, source/target currencies, provider, and available effective/capture timestamps. Displaying details must not fetch a replacement FX rate. The task already guards against presenting independently rounded converted amounts as authoritative; use the balance allocation rules if later exposing converted member contributions.

## First subsequent product opportunities

### Faster expense entry

**Evidence:** [AddExpensePage](../frontend/src/pages/AddExpensePage.tsx) already has a single-payer shortcut, equal splitting across all members, custom amounts, and total checks. Its payer/share state starts empty; there is no explicit equal split over selected participants or percentage/share mode.

**Recommendation:** Add participant checkboxes and explicit equal/custom modes first. Recalculate generated equal shares when the total or selected participants change; preserve intentional custom entries. Consider a current-user payer default when the verified identity is available. Add percentages and weighted shares next, converting their allocation into the existing exact two-decimal amounts before submission.

**Design constraints:** Use integer minor units and deterministic remainder allocation. Show which participants receive rounding cents. Remove zero entries or follow the existing API normalization; keep payer totals and share totals equal to the expense total. Do not silently apply group defaults to an altered membership list.

**Behavior to prove with TDD:** A 10.00 expense split among three selected members yields a stable 3.34/3.33/3.33 allocation; an excluded fourth member has no share. Editing custom values preserves them. Changing participants while in equal mode recomputes shares. Invalid percentages cannot submit. Backend validation remains authoritative.

**Scope:** Participant selection and equal/custom behavior can start in the frontend. Persisted default splits would require separate contract and schema planning.

### Repayment form filled from a suggestion

**Evidence:** [BalancePanel](../frontend/src/components/BalancePanel.tsx) renders suggestions without an action. [RepaymentPanel](../frontend/src/components/RepaymentPanel.tsx) requires payer, recipient, amount, and date to be entered independently.

**Recommendation:** Add a Record repayment action on a current suggestion that opens or fills an editable form. Explain why net settlement can name someone other than the original expense payer. Keep an explicit final action to record money already transferred.

**Design constraints:** Use group currency, retain partial repayment support, and disable suggestion actions when balance data is stale or failed to refresh. Revalidate against current membership. Filling, dismissing, or refreshing a form must not POST. Handle a changed suggestion without silently replacing an edited amount.

**Behavior to prove with TDD:** Opening a suggestion makes no write; confirmation makes one write; partial recording refreshes balances and history; failed history refresh does not invite recording the same confirmed transfer again. Switching groups cannot retain another group's draft.

**Scope:** Frontend integration using the existing repayment request. It does not provide duplicate safety when the server commits but the response is lost.

### Search and bounded expense history

**Evidence:** [getExpenses](../backend/src/utils/queries.ts) fetches every group expense and [GroupPage](../frontend/src/pages/GroupPage.tsx) renders the complete response. There is no query/filter or pagination contract.

**Recommendation:** Add group-scoped description/date/currency filtering and cursor pagination, with a stable order and unique tie-breaker. Distinguish no expenses from no matches. Apply member filters through stored payment/split records if those filters are added; a summary alone cannot establish participation.

**Design constraints:** A local filter over a loaded page must not claim to search all history. Changing a filter resets the cursor. Keep group balances based on the full ledger; filtering activity must not change the amount owed. Query design and indexes require measurement against representative history sizes.

**Behavior to prove with TDD:** Equal timestamps do not duplicate or omit rows across pages; unrelated groups remain inaccessible; filters compose correctly; clearing filters restores the list; filtered results leave balances unchanged.

**Scope:** Backend contract/query work followed by frontend controls. Pagination is explicitly deferred in existing roadmap notes and needs separate planning.

### Export for checking and sharing

**Evidence:** The endpoint inventory and active group UI contain no export. Splitwise's [reconciliation tools](https://kb.splitwise.com/balances-and-expenses/how-can-i-double-check-my-balances) demonstrate a useful reason for export: verifying how transactions affect member balances.

**Recommendation:** Offer an authorized group export containing expenses, payer contributions, shares, saved FX facts, and recorded repayments. Choose a clear row model or separate related files; summary amounts alone cannot reconstruct a multi-payer ledger. Include export time and currency meaning.

**Design constraints:** Read a consistent snapshot, preserve decimal strings, distinguish source and group currency, escape spreadsheet formula prefixes in user-controlled text, and exclude invitations and account secrets. Full-group export must not silently export only the currently visible page. Exports are portable records, not a replacement for database backups.

**Behavior to prove with TDD:** Exported member effects reconcile with authoritative balances, same- and cross-currency cases work, repayment signs are correct, unauthorized access fails, and names containing commas, quotes, newlines, or formula prefixes remain safe.

**Scope:** Backend serialization and authorization followed by a frontend download action; no bank integration is needed.

## Larger decisions for later planning

| Opportunity | Why it could help | Required decisions and dependencies |
| --- | --- | --- |
| Request idempotency | A retry after a lost response should not create another expense or repayment. | Persist keys scoped to caller/operation, compare payloads, return the original result, and handle concurrent requests atomically. Schema change applied manually. Button disabling alone is insufficient. |
| Draft recovery and offline use | Travel connectivity interruptions can lose entered work. | Begin with recoverable unsent drafts. Decide account/group isolation, retention and logout cleanup. Automatic offline writes require idempotency, reauthorization and FX failure handling. |
| Expense correction and audit history | Members can understand changes and recover mistakes. | Current policy is delete and recreate. Editing/restoration requires an explicit policy change, actor tracking, retained data, balance effects, and concurrent-update rules. Preserve member permissions unless separately changed. |
| Refunds | Canceled bookings and reimbursements need correct balance treatment. | Specify who received the refund, who benefits, linkage to the original expense, partial refunds, and FX semantics. Do not loosen positive-money validation without a coherent transaction model. |
| Recurring expenses | Shared rent and bills are repetitive. | Confirm actual demand; define timezone, month-end behavior, membership changes, cancellation, retries, unique occurrence identity, and rate capture at posting. Reusing a draft can precede scheduling. |
| Self-service password recovery | Friends can regain access without a maintainer. | Existing notes defer it. Define delivery, expiring one-use reset tokens, abuse controls, and session invalidation. Follow current release recovery guidance until that work is planned. |
| Categories and summaries | Groups can review trip spending. | Aggregate comparable currencies using saved conversions. Keep gross spending, personal shares, net balances, and repayments distinct; transfers are not new spending. |
| Splitwise import | Existing groups could move their records. | Inspect a real export format, map members, preview changes, deduplicate imports, and define historical FX behavior. Do not assume a summary CSV contains original payer/split/FX facts. |
| Receipts and notifications | Receipts provide context; notifications surface shared changes. | Private storage and retention for attachments; delivery, preferences, and safe payloads for notifications. Measure usefulness before adding OCR or payment integrations. |

In-place editing, audit history, recovery, idempotency, and pagination are already called out as deferred in [roadmap notes](../roadmap/NOTES.md). These findings support revisiting them after release; they do not make them new release blockers.

## Implementation handoff

Start with the linked [current task](../roadmap/phase04-release-operations/CURRENT_TASK.md). For any later selected feature, use the planning guide to scope one task at a time with a failing behavioral test, the smallest implementation, and refactoring. Keep backend and frontend contracts aligned; update the expected schema reference if needed, while leaving actual schema changes to the database owner.

Use the repository and task-specific verification commands. Product checks should include a subset split, multiple payers, a saved cross-currency expense, a partial repayment, and recovery after a confirmed save followed by failed refresh. Never interpret unit tests as live database or browser release evidence.
