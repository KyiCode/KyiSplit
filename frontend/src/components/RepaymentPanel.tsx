import { useEffect, useState, type FormEvent } from "react"
import type {
    GroupMember,
    Repayment
} from "../../../backend/src/contracts/api"
import {
    createRepayment,
    deleteRepayment,
    fetchRepayments
} from "../api/repayments"
import { ApiError } from "../api/client"
import Modal from "./Modal"

interface RepaymentPanelProps {
    groupId: string
    currency: string
    members: GroupMember[]
    onBalancesChanged: () => void
}

function RepaymentPanel({
    groupId,
    currency,
    members,
    onBalancesChanged
}: RepaymentPanelProps) {
    const [repayments, setRepayments] = useState<Repayment[]>([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState("")
    const [loadAttempt, setLoadAttempt] = useState(0)
    const [payerUserId, setPayerUserId] = useState("")
    const [receiverUserId, setReceiverUserId] = useState("")
    const [amount, setAmount] = useState("")
    const [repaymentDate, setRepaymentDate] = useState("")
    const [creating, setCreating] = useState(false)
    const [createError, setCreateError] = useState("")
    const [selectedRepayment, setSelectedRepayment] =
        useState<Repayment | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState("")

    useEffect(() => {
        let active = true
        fetchRepayments(groupId)
            .then(data => {
                if (active) setRepayments(data.repayments)
            })
            .catch(error => {
                if (active) setLoadError(historyErrorMessage(error))
            })
            .finally(() => {
                if (active) setLoading(false)
            })
        return () => { active = false }
    }, [groupId, loadAttempt])

    const memberIds = new Set(members.map(member => member.userId))
    const formValid = (
        memberIds.has(payerUserId) &&
        memberIds.has(receiverUserId) &&
        payerUserId !== receiverUserId &&
        validMoney(amount) &&
        validCalendarDate(repaymentDate)
    )

    function retryHistory() {
        setLoading(true)
        setLoadError("")
        setLoadAttempt(value => value + 1)
    }

    async function refreshHistory() {
        try {
            const data = await fetchRepayments(groupId)
            setRepayments(data.repayments)
            setLoadError("")
        } catch (error) {
            setLoadError(historyErrorMessage(error))
        }
    }

    async function handleCreate(event: FormEvent) {
        event.preventDefault()
        if (!formValid || creating) return
        setCreating(true)
        setCreateError("")
        try {
            await createRepayment(groupId, {
                payerUserId,
                receiverUserId,
                amount,
                repaymentDate
            })
            setPayerUserId("")
            setReceiverUserId("")
            setAmount("")
            setRepaymentDate("")
            onBalancesChanged()
            await refreshHistory()
        } catch (error) {
            setCreateError(createErrorMessage(error))
        } finally {
            setCreating(false)
        }
    }

    async function handleDelete() {
        if (!selectedRepayment || deleting) return
        setDeleting(true)
        setDeleteError("")
        try {
            await deleteRepayment(
                groupId,
                selectedRepayment.repaymentId
            )
            setSelectedRepayment(null)
            onBalancesChanged()
            await refreshHistory()
        } catch (error) {
            setDeleteError(deleteErrorMessage(error))
        } finally {
            setDeleting(false)
        }
    }

    const memberById = new Map(
        members.map(member => [member.userId, member.userGroupName])
    )
    const hasIntegrityMismatch = repayments.some(repayment => (
        !memberById.has(repayment.payerUserId) ||
        !memberById.has(repayment.receiverUserId) ||
        !memberById.has(repayment.recordedByUserId) ||
        repayment.currency !== currency
    ))

    return (
        <section
            className="repayment-panel"
            role="region"
            aria-label="Repayments"
        >
            <div className="section-heading">
                <div>
                    <span className="eyebrow">Recorded transfers</span>
                    <h2>Repayments</h2>
                </div>
            </div>

            <form className="repayment-form" onSubmit={handleCreate}>
                <label className="field">
                    <span>Payer</span>
                    <select
                        value={payerUserId}
                        onChange={event => setPayerUserId(event.target.value)}
                    >
                        <option value="">Choose member</option>
                        {members.map(member => (
                            <option key={member.userId} value={member.userId}>
                                {member.userGroupName}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="field">
                    <span>Receiver</span>
                    <select
                        value={receiverUserId}
                        onChange={event => setReceiverUserId(event.target.value)}
                    >
                        <option value="">Choose member</option>
                        {members.map(member => (
                            <option key={member.userId} value={member.userId}>
                                {member.userGroupName}
                            </option>
                        ))}
                    </select>
                </label>
                <div className="field">
                    <label htmlFor="repayment-amount">Amount</label>
                    <span className="repayment-amount-input">
                        <span className="repayment-currency">{currency}</span>
                        <input
                            id="repayment-amount"
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={amount}
                            onChange={event => setAmount(event.target.value)}
                        />
                    </span>
                </div>
                <label className="field">
                    <span>Repayment date</span>
                    <input
                        type="date"
                        value={repaymentDate}
                        onChange={event => setRepaymentDate(event.target.value)}
                    />
                </label>
                {createError && (
                    <div className="notice error small" role="alert">
                        {createError}
                    </div>
                )}
                <button
                    className="button primary"
                    disabled={!formValid || creating}
                >
                    {creating ? "Recording repayment…" : "Record repayment"}
                </button>
            </form>

            <div className="repayment-history-heading">
                <h3>History</h3>
                <small>Newest first</small>
            </div>

            {loadError && (
                <div className="notice error small" role="alert">
                    <span>{loadError}</span>
                    <button onClick={retryHistory}>Retry repayments</button>
                </div>
            )}

            {loading && repayments.length === 0 ? (
                <div
                    className="skeleton-list"
                    role="status"
                    aria-label="Loading repayments"
                >
                    <span /><span />
                </div>
            ) : !loadError && repayments.length === 0 ? (
                <p className="balance-empty">No repayments recorded yet.</p>
            ) : (
                <>
                    {hasIntegrityMismatch && (
                        <div className="notice error small" role="alert">
                            Some repayments do not match the current group
                            members.
                        </div>
                    )}
                    <ol
                        className="repayment-list"
                        aria-label="Repayment history"
                    >
                        {repayments.map(repayment => {
                            const payer = memberName(
                                memberById,
                                repayment.payerUserId
                            )
                            const receiver = memberName(
                                memberById,
                                repayment.receiverUserId
                            )
                            const recorder = memberName(
                                memberById,
                                repayment.recordedByUserId
                            )
                            return (
                                <li key={repayment.repaymentId}>
                                    <div className="repayment-copy">
                                        <strong>{payer} paid {receiver}</strong>
                                        <small>
                                            {formatDate(repayment.repaymentDate)}
                                            {" · Recorded by "}{recorder}
                                        </small>
                                    </div>
                                    <strong>
                                        {repayment.currency} {Number(
                                            repayment.amount
                                        ).toFixed(2)}
                                    </strong>
                                    <button
                                        className="icon-button subtle"
                                        aria-label={
                                            `Delete repayment from ${payer} to ${receiver}`
                                        }
                                        onClick={() => {
                                            setDeleteError("")
                                            setSelectedRepayment(repayment)
                                        }}
                                    >
                                        ×
                                    </button>
                                </li>
                            )
                        })}
                    </ol>
                </>
            )}

            {selectedRepayment && (
                <Modal
                    ariaLabel="Delete repayment?"
                    canClose={!deleting}
                    onClose={() => {
                        if (!deleting) setSelectedRepayment(null)
                    }}
                >
                    <section className="expense-dialog">
                        <span className="eyebrow">Delete repayment</span>
                        <h2>Delete repayment?</h2>
                        <p>
                            This removes the recorded transfer and recalculates
                            balances. It does not save a settlement suggestion.
                        </p>
                        {deleteError && (
                            <div className="notice error small" role="alert">
                                <span>{deleteError}</span>
                                <button onClick={handleDelete}>Try again</button>
                            </div>
                        )}
                        <div className="dialog-actions">
                            <button
                                className="button secondary"
                                disabled={deleting}
                                onClick={() => setSelectedRepayment(null)}
                            >
                                Keep repayment
                            </button>
                            <button
                                autoFocus
                                className="button danger"
                                disabled={deleting}
                                onClick={handleDelete}
                            >
                                {deleting
                                    ? "Deleting repayment…"
                                    : "Delete repayment"}
                            </button>
                        </div>
                    </section>
                </Modal>
            )}
        </section>
    )
}

function memberName(
    memberById: Map<string, string>,
    userId: string
) {
    return memberById.get(userId) || `Unknown member (${userId})`
}

function validMoney(value: string) {
    return /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value) && Number(value) > 0
}

function validCalendarDate(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
    const date = new Date(`${value}T00:00:00.000Z`)
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function formatDate(value: string) {
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

function historyErrorMessage(error: unknown) {
    if (error instanceof ApiError && error.status === 403) {
        return "Repayment history is unavailable because you no longer have access."
    }
    if (error instanceof ApiError && error.status === 0) {
        return "You’re offline. Reconnect to load repayment history."
    }
    return "Unable to load repayment history right now."
}

function createErrorMessage(error: unknown) {
    if (error instanceof ApiError && error.status === 403) {
        return "You no longer have permission to record repayments in this group."
    }
    if (error instanceof ApiError && error.status === 0) {
        return "You’re offline. Reconnect and try recording again."
    }
    if (error instanceof ApiError && error.code === "VALIDATION_ERROR") {
        return "Check the repayment details and try again."
    }
    return "Unable to record this repayment right now."
}

function deleteErrorMessage(error: unknown) {
    if (error instanceof ApiError && error.status === 403) {
        return "You no longer have permission to delete repayments from this group."
    }
    if (error instanceof ApiError && error.status === 404) {
        return "That repayment no longer exists. Refresh history to sync this group."
    }
    if (error instanceof ApiError && error.status === 0) {
        return "You’re offline. Reconnect and try deleting again."
    }
    return "Unable to delete this repayment right now."
}

export default RepaymentPanel
