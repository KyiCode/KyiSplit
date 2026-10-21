# Splitwise product research

Research date: 20 October 2026.

Splitwise combines a shared expense ledger with balance calculation and repayment recording. Its useful lessons for KyiSplit concern quick entry, understandable balances, and the ability to inspect shared changes. The comparison below uses the active routes in [App.tsx](../frontend/src/App.tsx) and the shared [API contract](../backend/src/contracts/api.ts).

## Product capabilities and comparison

| Capability | Splitwise evidence | Current KyiSplit behavior | Implication |
| --- | --- | --- | --- |
| Groups and shared expenses | The [product page](https://www.splitwise.com/) describes group expenses, balances, and repayment recording across web and mobile. | Groups, invitations, expense entry, balances, and repayment history exist. | Improve the existing journey before adding more group concepts. |
| Split entry | [Split methods](https://kb.splitwise.com/balances-and-expenses/what-are-different-ways-i-can-split-an-expense) include equal, exact, percentage, shares, adjustments, reimbursement, and itemized allocations. Equal splitting allows excluding individuals. | `AddExpensePage` has exact amount inputs, a single-payer shortcut, and equal splitting across all members. Multiple payers and manual subset allocations are supported. | Add an explicit participant selection step; percentages and shares can compile to the existing exact-amount request. |
| Debt simplification | [Simplify Debts](https://kb.splitwise.com/balances-and-expenses/what-is-simplify-debts) changes payment paths while preserving net balances. It works separately within each currency and has a group setting. | `balanceServices` calculates net positions in the group currency and uses deterministic greedy settlement suggestions. | Explain why a suggested recipient may differ from the original payer. Simplification itself already exists here. |
| Currency conversion | [Pro](https://www.splitwise.com/pro) describes conversion using current exchange rates. | Expense creation stores an FX snapshot; balances reuse it. | Make the saved rate visible. Preserve historical reproducibility when adding any currency features. |
| Finding expenses | [Pro](https://www.splitwise.com/pro) includes expense search. | The group page renders the returned expense list without search or pagination controls. | Add lookup and bounded history retrieval as histories grow. |
| Reusing splits | [Pro](https://www.splitwise.com/pro) offers group defaults for recurring allocation preferences. | No saved split preference or percentage/share mode appears in the current contract. | Begin with faster explicit entry; consider persistent defaults after participant semantics are clear. |
| Recurring bills | [Recurring expenses](https://kb.splitwise.com/balances-and-expenses/how-can-i-manage-recurring-expenses) support several intervals, optional reminders, and cancellation. Editing the latest occurrence can change future amounts while retaining past records. | No recurrence model, scheduling API, or scheduler appears in the reviewed implementation. | Defer automatic posting until duplicate prevention, scheduling, and FX timing are specified. |
| Shared activity | [Recent activity](https://kb.splitwise.com/account-issues/where-can-i-view-a-history-of-recent-changes-to-my-account) records changes to expenses, payments, groups, and friendships. | The UI's Activity section lists existing expenses. It is not a durable mutation history. Repayments have a recorder field. | Distinguish an expense list from an audit trail; consider the latter alongside future correction changes. |
| Deletion recovery | [Restore a deleted expense](https://kb.splitwise.com/balances-and-expenses/how-can-i-restore-a-deleted-expense) uses the activity feed and recalculates balances. | Expense deletion is permanent and the UI directs users to delete and recreate corrections. | Improve confirmation now; restoration requires a separate data retention and accounting design. |
| Export and reconciliation | [Double-check balances](https://kb.splitwise.com/balances-and-expenses/how-can-i-double-check-my-balances) describes printable summaries and transaction exports with member balance impacts. | No export endpoint or control appears in the reviewed routes and UI. | Export could make trip reconciliation and independent checking easier. |
| Member permissions | [Permissions](https://kb.splitwise.com/groups/can-i-prevent-group-members-from-changing-expenses-or-set-permissions) allow involved users or group members to manage expenses, without creator privileges. | The roadmap permits any current group member to manage that group's expenses and repayments. | Existing collaborative permissions fit the chosen audience; admin roles are not a prerequisite. |
| Refunds | [Refunds and reimbursements](https://kb.splitwise.com/balances-and-expenses/how-do-i-add-a-refund-or-reimbursement) describes a web reimbursement split mode. | Expense totals must be positive; no explicit refund transaction type exists. | A refund should have explicit accounting semantics. A repayment is a transfer between members and does not represent money returned by a merchant. |
| Account recovery | [Password reset](https://feedback.splitwise.com/knowledgebase/articles/149002-how-do-i-reset-my-password) documents self-service recovery. | Current auth routes expose signup, login, logout, and session verification; recovery is deferred in roadmap notes. | Keep the release's maintainer-assisted procedure accurate; assess self-service recovery separately. |

## Limits and premium features

Splitwise's [expense-limit help article](https://feedback.splitwise.com/knowledgebase/articles/2010350) confirms a daily expense limit on the free tier and removal through Pro. It does not specify one universal numeric allowance. The [Pro page](https://www.splitwise.com/pro) also lists receipt scanning, itemization, spending charts, and US-only card transaction import.

For KyiSplit, a useful product hypothesis is low-friction entry for a trusted group without subscription interruptions. The reviewed code has no subscription or daily expense quota. This is an observation about the current implementation, not a promise about future pricing or service capacity.

## Lessons for KyiSplit

**Explain the ledger.** Members need to see who paid, who owes a share, and which saved conversion produced their balance. KyiSplit stores the underlying records but its current detail dialog shows only amount and date. Existing Tasks 27 and 28 directly address this.

**Reduce repetitive entry.** Participant selection, a clear equal/custom mode, and an editable repayment form filled from a suggestion would use capabilities KyiSplit already has. Percentage and share allocation can follow without changing the expense storage format.

**Preserve the meaning of repayment.** The current distinction between calculated suggestions and recorded repayments is useful. Filling a form should never create a record until a member explicitly confirms an actual transfer.

**Treat more complex features as separate decisions.** Notifications need delivery and preference handling; receipt uploads need private storage and retention; offline writes need synchronization and duplicate protection. These carry materially more work than adding a display control.

The recommendations reflect KyiSplit's repository and intended audience. They are product judgments, not measured findings from user interviews. Before choosing later features, observe a few friends entering subset expenses, tracing an FX balance, and recording a repayment; note task completion, errors, and points of confusion.
