# Splitwise research and KyiSplit improvements

Reviewed on 20 October 2026 against local working tree based on commit `9a0472d`.

KyiSplit already has the core accounting needed by a private group of friends. The highest value improvement is making those records easier to understand and use: show the saved expense breakdown, make saving and refreshing unambiguous, then reduce the effort of entering and finding expenses.

## Read the findings

- [Splitwise product research](splitwise.md): sourced capabilities, product lessons, and comparison with KyiSplit.
- [Recommended improvements](improvements.md): priorities, code evidence, dependencies, and behavioral verification examples.

## Scope and assumptions

The comparison uses the repository's existing private-friends audience, two-decimal money entry, member permissions, Flyway migration administration, and delete-and-recreate correction policy. Splitwise's broader feature set is a benchmark for recommendations, rather than a requirement to copy every feature.

Splitwise claims come from public official product and help pages. This is a documentation and source-code comparison; it does not establish current behavior inside a signed-in Splitwise account or visual usability of either app. Prices and an exact free daily expense allowance are omitted because the reviewed official pages do not establish a universal current value.

The local working tree includes substantial pre-existing changes and untracked roadmap tasks. Recommendations distinguish implemented behavior from planned work. This research adds only files in `Research`; it does not change application behavior, roadmap status, or task order.

## Recommended order

1. Complete existing Phase 04 Tasks 25–32 in their documented order, starting with confirmed group creation recovery. These already cover most immediate trust and clarity gaps.
2. Complete the remaining release gates before adding product scope.
3. Consider faster expense entry and repayment prefilling as the first subsequent product improvements.
4. Add search, pagination, and export as groups accumulate history.
5. Evaluate schema-backed idempotency before automatic retries, offline writes, or recurring posting. Evaluate audit history before changing the correction policy.

These are research recommendations. The authoritative implementation sequence remains [the active phase](../roadmap/phase04-release-operations/README.md) and its [current task](../roadmap/phase04-release-operations/CURRENT_TASK.md).

## Verification

The following checks passed on the current local application during this research:

| Command | Result |
| --- | --- |
| `npm.cmd --prefix backend test` | 27 test files, 259 tests passed; includes TypeScript checks |
| `npm.cmd --prefix frontend test` | 16 test files, 74 tests passed |
| `npm.cmd --prefix frontend run lint` | Passed |
| `npm.cmd --prefix frontend run build` | Passed |

The backend runner emitted a warning about future Vite native config loading of its CommonJS TypeScript configuration; the command succeeded. These results include pre-existing local work and do not establish completion of its roadmap tasks. Live schema checks, browser E2E, manual accessibility, and deployment verification were not run for this documentation-only change. No behavioral implementation or new tests were added.
