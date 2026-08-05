import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import BalancePanel from "../components/BalancePanel"
import ExpenseBox from "../components/ExpenseBox"
import Modal from "../components/Modal"
import PageShell from "../components/PageShell"
import RepaymentPanel from "../components/RepaymentPanel"
import { fetchBalance } from "../api/balances"
import { deleteExpense, fetchExpenses } from "../api/expenses"
import { fetchGroup, fetchGroupMembers, generateInvite } from "../api/groups"
import { ApiError, apiErrorMessage } from "../api/client"
import type { ExpenseType, GroupMemberType } from "../interfaces/interface"
import type { BalanceData } from "../../../backend/src/contracts/api"

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
    const [confirmingDelete, setConfirmingDelete] = useState(false)
    const [deletingExpense, setDeletingExpense] = useState(false)
    const [deleteError, setDeleteError] = useState("")
    const [balanceData, setBalanceData] = useState<BalanceData | null>(null)
    const [balanceLoading, setBalanceLoading] = useState(true)
    const [balanceError, setBalanceError] = useState("")
    const [balanceAttempt, setBalanceAttempt] = useState(0)
    const [balanceGroupId, setBalanceGroupId] = useState("")
    const { groupId } = useParams()
    const navigate = useNavigate()

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
    }

    async function refreshActivity() {
        if (!groupId) return
        const expenseData = await fetchExpenses(groupId)
        setExpenses(expenseData.expenses)
        refreshBalances()
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
            await refreshActivity()
            setSelectedExpense(null)
            setConfirmingDelete(false)
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
                        {inviteLoading ? "Creating…" : "Invite people"}
                    </button>
                    <button className="button primary" onClick={() => navigate(`/group/${groupId}/addexpense`)}>
                        <span>＋</span> Add expense
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
                                        onSelect={setSelectedExpense}
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

            {selectedExpense && (
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
                                    className="button secondary"
                                    disabled={deletingExpense}
                                    onClick={() => {
                                        setConfirmingDelete(false)
                                        setDeleteError("")
                                    }}
                                >
                                    Keep expense
                                </button>
                                <button
                                    autoFocus
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
                            <p>
                                To correct this expense, delete it and create
                                it again.
                            </p>
                            <div className="dialog-actions">
                                <button
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
