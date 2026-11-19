import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import BalancePanel from "../components/BalancePanel"
import ExpenseBox from "../components/ExpenseBox"
import Modal from "../components/Modal"
import PageShell from "../components/PageShell"
import Icon from "../components/Icon"
import RepaymentPanel from "../components/RepaymentPanel"
import { fetchBalance } from "../api/balances"
import { deleteExpense, fetchExpenseDetail, fetchExpenses } from "../api/expenses"
import { fetchGroup, fetchGroupMembers, generateInvite } from "../api/groups"
import { ApiError, apiErrorMessage } from "../api/client"
import type { ExpenseType, GroupMemberType } from "../interfaces/interface"
import type { BalanceData, ExpenseDetail } from "../../../backend/src/contracts/api"

function GroupPage() {
    const [expenses, setExpenses] = useState<ExpenseType[]>([])
    const [members, setMembers] = useState<GroupMemberType[]>([])
    const [groupName, setGroupName] = useState("")
    const [groupCurrency, setGroupCurrency] = useState("")
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [accessDenied, setAccessDenied] = useState(false)
    const [loadAttempt, setLoadAttempt] = useState(0)
    const [inviteLink, setInviteLink] = useState("")
    const [inviteLoading, setInviteLoading] = useState(false)
    const [copied, setCopied] = useState(false)
    const [selectedExpense, setSelectedExpense] =
        useState<ExpenseType | null>(null)
    const [expenseDetail, setExpenseDetail] = useState<ExpenseDetail | null>(null)
    const [expenseDetailLoading, setExpenseDetailLoading] = useState(false)
    const [expenseDetailError, setExpenseDetailError] = useState("")
    const [expenseDetailAttempt, setExpenseDetailAttempt] = useState(0)
    const [confirmingDelete, setConfirmingDelete] = useState(false)
    const returnDeleteFocus = useRef(false)
    const deleteExpenseButton = useRef<HTMLButtonElement | null>(null)
    const [deletingExpense, setDeletingExpense] = useState(false)
    const [deleteError, setDeleteError] = useState("")
    const [activitySyncError, setActivitySyncError] = useState("")
    const [activitySyncing, setActivitySyncing] = useState(false)
    const [balanceData, setBalanceData] = useState<BalanceData | null>(null)
    const [balanceLoading, setBalanceLoading] = useState(true)
    const [balanceError, setBalanceError] = useState("")
    const [balanceAttempt, setBalanceAttempt] = useState(0)
    const [balanceGroupId, setBalanceGroupId] = useState("")
    const { groupId } = useParams()
    const navigate = useNavigate()

    useEffect(() => {
        if (!groupId || !selectedExpense || selectedExpense.groupId !== groupId) return
        let active = true
        fetchExpenseDetail(groupId, selectedExpense.expenseId)
            .then(data => {
                if (!active) return
                if (!isValidExpenseDetail(data?.expense, groupId, selectedExpense.expenseId)) {
                    setExpenseDetailError("Saved expense details are incomplete or malformed.")
                    return
                }
                setExpenseDetail(data.expense)
            })
            .catch(error => {
                if (active) setExpenseDetailError(expenseDetailErrorMessage(error))
            })
            .finally(() => {
                if (active) setExpenseDetailLoading(false)
            })
        return () => { active = false }
    }, [groupId, selectedExpense, expenseDetailAttempt])

    useEffect(() => {
        if (!groupId) return
        let active = true

        Promise.all([
            fetchGroup(groupId),
            fetchExpenses(groupId),
            fetchGroupMembers(groupId)
        ]).then(([groupData, expenseData, memberData]) => {
            if (!active) return
            setError("")
            setAccessDenied(false)
            setGroupName(groupData.groupName)
            setGroupCurrency(groupData.defaultCurrency)
            setExpenses(expenseData.expenses)
            setMembers(memberData)
        }).catch(error => {
            if (!active) return
            if (error instanceof ApiError && error.status === 403) {
                setAccessDenied(true)
                setExpenses([])
                setMembers([])
                setGroupName("")
                setGroupCurrency("")
            } else {
                setError(apiErrorMessage(
                    error,
                    "We couldn't load this group."
                ))
            }
        })
            .finally(() => active && setLoading(false))

        return () => { active = false }
    }, [groupId, loadAttempt])

    useEffect(() => {
        if (!groupId) return
        let active = true
        fetchBalance(groupId)
            .then(data => {
                if (active) {
                    setBalanceData(data)
                    setBalanceGroupId(groupId)
                }
            })
            .catch(error => {
                if (active) {
                    setBalanceError(balanceErrorMessage(error))
                    setBalanceGroupId(groupId)
                }
            })
            .finally(() => {
                if (active) setBalanceLoading(false)
            })
        return () => { active = false }
    }, [groupId, balanceAttempt])

    async function handleInvite() {
        if (!groupId) return
        setInviteLoading(true)
        setError("")
        try {
            const data = await generateInvite(groupId)
            setInviteLink(data.inviteUrl)
        } catch (error) {
            if (error instanceof ApiError && error.status === 403) {
                setAccessDenied(true)
            } else {
                setError(apiErrorMessage(
                    error,
                    "Unable to create an invite right now."
                ))
            }
        } finally {
            setInviteLoading(false)
        }
    }

    async function copyInvite() {
        try {
            await navigator.clipboard.writeText(inviteLink)
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1800)
        } catch {
            setError("Copy failed. Select and copy the invite link manually.")
        }
    }

    function closeExpenseDialog() {
        if (deletingExpense) return
        setSelectedExpense(null)
        setConfirmingDelete(false)
        setDeleteError("")
        setExpenseDetailLoading(false)
    }

    function openExpenseDialog(expense: ExpenseType) {
        setSelectedExpense(expense)
        setConfirmingDelete(false)
        setDeleteError("")
        setExpenseDetail(null)
        setExpenseDetailLoading(true)
        setExpenseDetailError("")
    }

    function retryExpenseDetail() {
        setExpenseDetail(null)
        setExpenseDetailLoading(true)
        setExpenseDetailError("")
        setExpenseDetailAttempt(value => value + 1)
    }

    async function refreshActivity() {
        if (!groupId) return
        setActivitySyncing(true)
        try {
            const expenseData = await fetchExpenses(groupId)
            setExpenses(expenseData.expenses)
            setActivitySyncError("")
        } catch {
            setActivitySyncError(
                "Expense deleted, but group activity could not be synchronized."
            )
        } finally {
            setActivitySyncing(false)
        }
    }

    function refreshBalances() {
        setBalanceLoading(true)
        setBalanceError("")
        setBalanceAttempt(value => value + 1)
    }

    async function handleDeleteExpense() {
        if (!groupId || !selectedExpense || deletingExpense) return
        setDeletingExpense(true)
        setDeleteError("")
        try {
            await deleteExpense(groupId, selectedExpense.expenseId)
            setExpenses(current => current.filter(expense => (
                expense.expenseId !== selectedExpense.expenseId
            )))
            setSelectedExpense(null)
            setConfirmingDelete(false)
            refreshBalances()
            void refreshActivity()
        } catch (error) {
            if (error instanceof ApiError && error.status === 403) {
                setDeleteError(
                    "You no longer have permission to delete expenses from this group."
                )
            } else if (error instanceof ApiError && error.status === 404) {
                setDeleteError(
                    "That expense no longer exists. Refresh activity to sync this group."
                )
            } else if (error instanceof ApiError && error.status === 0) {
                setDeleteError(
                    "You’re offline. Reconnect and try deleting again."
                )
            } else {
                setDeleteError(
                    "Unable to delete this expense right now."
                )
            }
        } finally {
            setDeletingExpense(false)
        }
    }

    if (accessDenied) {
        return (
            <PageShell>
                <section className="empty-state">
                    <span className="empty-mark">!</span>
                    <h1>Group access denied</h1>
                    <p>You are not a current member of this group.</p>
                    <button
                        className="button secondary"
                        onClick={() => navigate("/")}
                    >
                        Return to your groups
                    </button>
                </section>
            </PageShell>
        )
    }

    return (
        <PageShell action={<button className="button ghost compact" onClick={() => navigate("/")}>← Groups</button>}>
            <section className="group-hero">
                <div className="group-title-block">
                    <span className="eyebrow">Shared group</span>
                    <h1>{loading ? "Loading…" : groupName || "Untitled group"}</h1>
                    <div className="group-meta">
                        <span>{members.length} {members.length === 1 ? "member" : "members"}</span>
                        <span className="meta-divider" />
                        <span>{expenses.length} {expenses.length === 1 ? "expense" : "expenses"}</span>
                        <span className="meta-divider" />
                        <span>{groupCurrency}</span>
                    </div>
                </div>
                <div className="group-actions">
                    <button className="button secondary" onClick={handleInvite} disabled={inviteLoading}>
                        <Icon name="people" />
                        {inviteLoading ? "Creating…" : "Invite people"}
                    </button>
                    <button className="button primary" onClick={() => navigate(`/group/${groupId}/addexpense`)}>
                        <Icon name="plus" /> Add expense
                    </button>
                </div>
            </section>

            {error && (
                <div className="notice error" role="alert">
                    <span>{error}</span>
                    <button onClick={() => {
                        setLoading(true)
                        setError("")
                        setAccessDenied(false)
                        setLoadAttempt(value => value + 1)
                    }}>
                        Try again
                    </button>
                </div>
            )}

            {inviteLink && (
                <section className="invite-banner">
                    <div>
                        <span className="eyebrow">Invite ready</span>
                        <p>{inviteLink}</p>
                    </div>
                    <button className="button secondary compact" onClick={copyInvite}>{copied ? "Copied!" : "Copy link"}</button>
                    <button className="icon-button subtle" onClick={() => setInviteLink("")} aria-label="Close invite">×</button>
                </section>
            )}

            <section className="group-layout">
                <div className="group-main-column">
                    <div className="expense-panel">
                    <div className="section-heading">
                        <div>
                            <span className="eyebrow">Activity</span>
                            <h2>Recent expenses</h2>
                        </div>
                    </div>
                    {activitySyncError && (
                        <div className="notice error small" role="alert">
                            <span>{activitySyncError}</span>
                            <button
                                disabled={activitySyncing}
                                onClick={() => void refreshActivity()}
                            >
                                {activitySyncing
                                    ? "Refreshing activity…"
                                    : "Refresh activity"}
                            </button>
                        </div>
                    )}
                    {loading ? (
                        <div
                            className="skeleton-list"
                            role="status"
                            aria-label="Loading expenses"
                        >
                            <span /><span /><span />
                        </div>
                    ) : expenses.length > 0 ? (
                        <ul
                            className="expense-list"
                            aria-label="Recent expenses"
                        >
                            {expenses.map(expense => (
                                <li key={expense.expenseId}>
                                    <ExpenseBox
                                        expense={expense}
                                        onSelect={openExpenseDialog}
                                    />
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="empty-state compact-empty">
                            <span className="empty-mark">+</span>
                            <h3>Nothing split yet</h3>
                            <p>Add the first expense and KyiSplit will keep the maths tidy.</p>
                        </div>
                    )}
                    </div>

                    <BalancePanel
                        data={
                            balanceGroupId === groupId ? balanceData : null
                        }
                        error={
                            balanceGroupId === groupId ? balanceError : ""
                        }
                        loading={
                            balanceLoading || balanceGroupId !== groupId
                        }
                        members={members}
                        onRetry={refreshBalances}
                    />
                    {!loading && groupId && groupCurrency && (
                        <RepaymentPanel
                            groupId={groupId}
                            currency={groupCurrency}
                            members={members}
                            onBalancesChanged={refreshBalances}
                        />
                    )}
                </div>

                <aside className="members-panel">
                    <span className="eyebrow">People</span>
                    <h2>In this group</h2>
                    <ul className="people-list" aria-label="Group members">
                        {members.map(member => (
                            <li className="person-row" key={member.userId}>
                                <span className="person-avatar">{member.userGroupName.slice(0, 1).toUpperCase()}</span>
                                <strong>{member.userGroupName}</strong>
                            </li>
                        ))}
                    </ul>
                </aside>
            </section>

            {selectedExpense && selectedExpense.groupId === groupId && (
                <Modal
                    ariaLabel={
                        confirmingDelete
                            ? `Delete ${selectedExpense.expenseName}?`
                            : `${selectedExpense.expenseName} expense details`
                    }
                    canClose={!deletingExpense}
                    onClose={closeExpenseDialog}
                >
                    {confirmingDelete ? (
                        <section className="expense-dialog">
                            <span className="eyebrow">Delete expense</span>
                            <h2>Delete {selectedExpense.expenseName}?</h2>
                            <p>
                                This permanently removes the expense, its
                                payments, and its splits.
                            </p>
                            {deleteError && (
                                <div className="notice error small" role="alert">
                                    <span>{deleteError}</span>
                                    <button
                                        disabled={deletingExpense}
                                        onClick={handleDeleteExpense}
                                    >
                                        Try again
                                    </button>
                                </div>
                            )}
                            <div className="dialog-actions">
                                <button
                                    ref={button => button?.focus()}
                                    className="button secondary"
                                    disabled={deletingExpense}
                                    onClick={() => {
                                        returnDeleteFocus.current = true
                                        setConfirmingDelete(false)
                                        setDeleteError("")
                                    }}
                                >
                                    Keep expense
                                </button>
                                <button
                                    className="button danger"
                                    disabled={deletingExpense}
                                    onClick={handleDeleteExpense}
                                >
                                    {deletingExpense
                                        ? "Deleting expense…"
                                        : "Delete expense"}
                                </button>
                            </div>
                        </section>
                    ) : (
                        <section className="expense-dialog">
                            <span className="eyebrow">Expense detail</span>
                            <h2>{selectedExpense.expenseName}</h2>
                            <dl className="expense-detail-list">
                                <div>
                                    <dt>Original amount</dt>
                                    <dd>
                                        {selectedExpense.currency}{" "}
                                        {Number(
                                            selectedExpense.expenseTotal
                                        ).toFixed(2)}
                                    </dd>
                                </div>
                                <div>
                                    <dt>Date</dt>
                                    <dd>{formatExpenseDate(
                                        selectedExpense.date
                                    )}</dd>
                                </div>
                            </dl>
                            {expenseDetailLoading && (
                                <p role="status" aria-label="Loading expense details">
                                    Loading saved expense details…
                                </p>
                            )}
                            {expenseDetailError && (
                                <div className="notice error small" role="alert">
                                    <span>{expenseDetailError}</span>
                                    <button onClick={retryExpenseDetail}>Retry details</button>
                                </div>
                            )}
                            {expenseDetail &&
                                expenseDetail.groupId === groupId &&
                                expenseDetail.expenseId === selectedExpense.expenseId && (
                                <ExpenseBreakdown
                                    detail={expenseDetail}
                                    members={members}
                                    groupCurrency={groupCurrency}
                                />
                            )}
                            <p>
                                To correct this expense, delete it and create
                                it again.
                            </p>
                            <div className="dialog-actions">
                                <button
                                    ref={button => {
                                        deleteExpenseButton.current = button
                                        if (button && returnDeleteFocus.current) {
                                            returnDeleteFocus.current = false
                                            button.focus()
                                        }
                                    }}
                                    className="button danger"
                                    onClick={() => setConfirmingDelete(true)}
                                >
                                    Delete expense
                                </button>
                            </div>
                        </section>
                    )}
                </Modal>
            )}
        </PageShell>
    )
}

function ExpenseBreakdown({
    detail,
    members,
    groupCurrency
}: {
    detail: ExpenseDetail
    members: GroupMemberType[]
    groupCurrency: string
}) {
    const memberName = (userId: string) => (
        members.find(member => member.userId === userId)?.userGroupName ||
        `Unknown member (${userId})`
    )
    const crossCurrency = detail.fxSnapshot.sourceCurrency !== detail.fxSnapshot.targetCurrency

    return (
        <div className="expense-breakdown">
            <section aria-labelledby="expense-payers-heading">
                <h3 id="expense-payers-heading">Who paid</h3>
                <ul className="expense-breakdown-list" aria-label="Payers">
                    {detail.paidBy.map((entry, index) => (
                        <li key={`${entry.userId}-${index}`}>
                            <span>{memberName(entry.userId)}</span>
                            <strong>{detail.currency} {entry.amount}</strong>
                        </li>
                    ))}
                </ul>
            </section>
            <section aria-labelledby="expense-shares-heading">
                <h3 id="expense-shares-heading">Who owes a share</h3>
                <ul className="expense-breakdown-list" aria-label="Shares">
                    {detail.splits.map((entry, index) => (
                        <li key={`${entry.userId}-${index}`}>
                            <span>{memberName(entry.userId)}</span>
                            <strong>{detail.currency} {entry.amount}</strong>
                        </li>
                    ))}
                </ul>
            </section>
            {crossCurrency && (
                <aside className="expense-fx-note" aria-label="Saved conversion rate">
                    <strong>
                        1 {detail.fxSnapshot.sourceCurrency} = {detail.fxSnapshot.rate} {detail.fxSnapshot.targetCurrency}
                    </strong>
                    <span>Provider: {detail.fxSnapshot.provider}</span>
                    {detail.fxSnapshot.effectiveAt && (
                        <span>Rate effective: {formatTimestamp(detail.fxSnapshot.effectiveAt)}</span>
                    )}
                    <span>Rate saved: {formatTimestamp(detail.fxSnapshot.capturedAt)}</span>
                    <p>
                        This saved rate converts the original {detail.fxSnapshot.sourceCurrency} expense to {groupCurrency || detail.fxSnapshot.targetCurrency} for group balance calculations. The saved rate is fixed for this expense.
                    </p>
                </aside>
            )}
        </div>
    )
}

function formatTimestamp(value: string) {
    return new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC"
    }).format(new Date(value)) + " UTC"
}

function isValidExpenseDetail(
    value: unknown,
    groupId: string,
    expenseId: string
): value is ExpenseDetail {
    if (!value || typeof value !== "object") return false
    const detail = value as Partial<ExpenseDetail>
    const toMinorUnits = (amount: unknown) => {
        if (typeof amount !== "string") return null
        const match = /^(0|[1-9]\d*)\.(\d{2})$/.exec(amount)
        return match ? BigInt(match[1]) * 100n + BigInt(match[2]) : null
    }
    const validEntries = (entries: unknown) => (
        Array.isArray(entries) && entries.length > 0 && entries.every(entry => (
            entry && typeof entry.userId === "string" && entry.userId.length > 0 &&
            toMinorUnits(entry.amount) !== null
        ))
    )
    const entriesMatchTotal = (entries: unknown, total: unknown) => {
        if (!Array.isArray(entries)) return false
        const expected = toMinorUnits(total)
        if (expected === null) return false
        const actual = entries.reduce<bigint | null>((sum, entry) => {
            const amount = toMinorUnits(entry?.amount)
            return sum === null || amount === null ? null : sum + amount
        }, 0n)
        return actual === expected
    }
    const fx = detail.fxSnapshot
    if (!fx) return false
    return detail.groupId === groupId && detail.expenseId === expenseId &&
        typeof detail.currency === "string" && /^[A-Z]{3}$/.test(detail.currency) &&
        validEntries(detail.paidBy) && validEntries(detail.splits) &&
        entriesMatchTotal(detail.paidBy, detail.expenseTotal) &&
        entriesMatchTotal(detail.splits, detail.expenseTotal) &&
        fx.sourceCurrency === detail.currency &&
        /^[A-Z]{3}$/.test(fx.sourceCurrency) && /^[A-Z]{3}$/.test(fx.targetCurrency) &&
        /^\d+(\.\d+)?$/.test(fx.rate) && Number(fx.rate) > 0 &&
        typeof fx.provider === "string" &&
        fx.provider.length > 0 && typeof fx.capturedAt === "string" &&
        (fx.effectiveAt === null || typeof fx.effectiveAt === "string")
}

function expenseDetailErrorMessage(error: unknown) {
    if (error instanceof ApiError && error.status === 403) {
        return "You no longer have access to these expense details."
    }
    if (error instanceof ApiError && error.status === 404) {
        return "This expense could not be found. Refresh activity and try again."
    }
    if (error instanceof ApiError && error.code === "DATA_INTEGRITY_ERROR") {
        return "Saved expense details are incomplete. Retry after refreshing."
    }
    if (error instanceof ApiError && error.status === 0) {
        return "You’re offline. Reconnect to load expense details."
    }
    return "Unable to load expense details right now."
}

function formatExpenseDate(value: string) {
    const parts = new Intl.DateTimeFormat("en", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC"
    }).formatToParts(new Date(`${value}T00:00:00.000Z`))
    const part = (type: Intl.DateTimeFormatPartTypes) => (
        parts.find(item => item.type === type)?.value || ""
    )
    return `${part("day")} ${part("month")} ${part("year")}`
}

function balanceErrorMessage(error: unknown) {
    if (error instanceof ApiError && error.status === 403) {
        return "Balances are unavailable because you no longer have access."
    }
    if (
        error instanceof ApiError &&
        error.code === "DATA_INTEGRITY_ERROR"
    ) {
        return "Stored balance data is incomplete. Activity is still available."
    }
    if (error instanceof ApiError && error.status === 0) {
        return "You’re offline. Reconnect to load balances."
    }
    return "Unable to load balances right now."
}

export default GroupPage
