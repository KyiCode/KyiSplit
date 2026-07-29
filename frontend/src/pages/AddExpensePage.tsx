import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import CurrencyPicker from "../components/CurrencyPicker"
import DatePicker from "../components/DatePicker"
import Modal from "../components/Modal"
import PageShell from "../components/PageShell"
import { createExpense } from "../api/expenses"
import { fetchGroupMembers } from "../api/groups"
import type { CurrencyType, GroupMemberType } from "../interfaces/interface"

const today = new Date().toISOString().split("T")[0]

function AddExpensePage() {
    const { groupId } = useParams()
    const navigate = useNavigate()
    const [groupMembers, setGroupMembers] = useState<GroupMemberType[]>([])
    const [membersLoading, setMembersLoading] = useState(true)
    const [showCurrencyPicker, setShowCurrencyPicker] = useState(false)
    const [expenseName, setExpenseName] = useState("")
    const [expenseTotal, setExpenseTotal] = useState("")
    const [expenseCurrency, setExpenseCurrency] = useState<CurrencyType>()
    const [expenseDate, setExpenseDate] = useState(today)
    const [amountPaid, setAmountPaid] = useState<Record<string, string>>({})
    const [amountSplit, setAmountSplit] = useState<Record<string, string>>({})
    const [errorMessage, setErrorMessage] = useState("")
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (!groupId) return
        let active = true
        fetchGroupMembers(groupId)
            .then(data => {
                if (active && Array.isArray(data)) setGroupMembers(data)
            })
            .catch(() => active && setErrorMessage("Unable to load group members."))
            .finally(() => active && setMembersLoading(false))
        return () => { active = false }
    }, [groupId])

    const total = Number(expenseTotal)
    const paidTotal = useMemo(
        () => Object.values(amountPaid).reduce((sum, value) => sum + Number(value || 0), 0),
        [amountPaid]
    )
    const splitTotal = useMemo(
        () => Object.values(amountSplit).reduce((sum, value) => sum + Number(value || 0), 0),
        [amountSplit]
    )
    const basicsReady = Boolean(
        expenseName.trim() &&
        expenseTotal &&
        Number.isFinite(total) &&
        total > 0 &&
        expenseCurrency &&
        expenseDate
    )
    const totalsMatch = Math.abs(paidTotal - total) < 0.005 && Math.abs(splitTotal - total) < 0.005
    const canSubmit = basicsReady && totalsMatch && groupMembers.length > 0 && !submitting

    function updateAmount(
        setter: React.Dispatch<React.SetStateAction<Record<string, string>>>,
        userId: string,
        value: string
    ) {
        if (value !== "" && (Number.isNaN(Number(value)) || Number(value) < 0)) return
        setter(previous => ({ ...previous, [userId]: value }))
    }

    function assignSinglePayer(userId: string) {
        setAmountPaid(Object.fromEntries(
            groupMembers.map(member => [member.userId, member.userId === userId ? total.toFixed(2) : "0.00"])
        ))
    }

    function splitEqually() {
        if (!total || groupMembers.length === 0) return
        const cents = Math.round(total * 100)
        const base = Math.floor(cents / groupMembers.length)
        const remainder = cents - base * groupMembers.length
        setAmountSplit(Object.fromEntries(
            groupMembers.map((member, index) => [
                member.userId,
                ((base + (index < remainder ? 1 : 0)) / 100).toFixed(2)
            ])
        ))
    }

    async function handleAddExpense() {
        if (!groupId || !expenseCurrency || !canSubmit) return
        setSubmitting(true)
        setErrorMessage("")
        try {
            const data = await createExpense(
                groupId,
                expenseName.trim(),
                expenseTotal,
                expenseDate,
                expenseCurrency.currencyIso,
                amountPaid,
                amountSplit
            )
            if (data.status === "success") navigate(`/group/${groupId}`)
            else setErrorMessage(data.message || "Unable to add this expense.")
        } catch {
            setErrorMessage("Unable to add this expense right now.")
        } finally {
            setSubmitting(false)
        }
    }

    if (!groupId) {
        return <div className="fatal-state">This expense link is missing a group.</div>
    }

    return (
        <PageShell action={<button className="button ghost compact" onClick={() => navigate(`/group/${groupId}`)}>← Back to group</button>}>
            <section className="form-hero">
                <span className="eyebrow">New expense</span>
                <h1>Add it while it’s fresh.</h1>
                <p>Tell us what happened, who covered it, and how everyone shares it.</p>
            </section>

            <div className="expense-form-layout">
                <div className="expense-form-stack">
                    <section className="form-card">
                        <div className="step-heading">
                            <span className="step-number">01</span>
                            <div>
                                <h2>Expense details</h2>
                                <p>The basics first.</p>
                            </div>
                        </div>
                        <div className="form-grid">
                            <label className="field field-wide">
                                <span>Description</span>
                                <input value={expenseName} onChange={event => setExpenseName(event.target.value)} placeholder="Dinner at Burnt Ends" />
                            </label>
                            <label className="field amount-field">
                                <span>Total amount</span>
                                <span className="amount-input-wrap">
                                    <button type="button" onClick={() => setShowCurrencyPicker(true)}>
                                        {expenseCurrency?.currencyIso || "CUR"}
                                    </button>
                                    <input type="number" min="0" step="0.01" value={expenseTotal} onChange={event => setExpenseTotal(event.target.value)} placeholder="0.00" />
                                </span>
                            </label>
                            <label className="field">
                                <span>Date</span>
                                <DatePicker value={expenseDate} onChange={setExpenseDate} />
                            </label>
                        </div>
                    </section>

                    <section className="form-card">
                        <div className="step-heading">
                            <span className="step-number">02</span>
                            <div>
                                <h2>Who paid?</h2>
                                <p>Pick one person or combine payments.</p>
                            </div>
                            <span className={`total-pill ${basicsReady && Math.abs(paidTotal - total) < 0.005 ? "complete" : ""}`}>
                                {paidTotal.toFixed(2)} / {total > 0 ? total.toFixed(2) : "0.00"}
                            </span>
                        </div>
                        <MemberAmounts
                            members={groupMembers}
                            values={amountPaid}
                            currency={expenseCurrency?.currencyIso}
                            loading={membersLoading}
                            onChange={(userId, value) => updateAmount(setAmountPaid, userId, value)}
                            actionLabel="Paid all"
                            onAction={assignSinglePayer}
                        />
                    </section>

                    <section className="form-card">
                        <div className="step-heading">
                            <span className="step-number">03</span>
                            <div>
                                <h2>How is it split?</h2>
                                <p>Enter custom shares or divide it equally.</p>
                            </div>
                            <button className="button ghost compact" type="button" disabled={!basicsReady} onClick={splitEqually}>Split equally</button>
                        </div>
                        <MemberAmounts
                            members={groupMembers}
                            values={amountSplit}
                            currency={expenseCurrency?.currencyIso}
                            loading={membersLoading}
                            onChange={(userId, value) => updateAmount(setAmountSplit, userId, value)}
                        />
                        <div className="split-summary">
                            <span>Assigned</span>
                            <strong className={basicsReady && Math.abs(splitTotal - total) < 0.005 ? "success-text" : ""}>
                                {expenseCurrency?.currencyIso || "—"} {splitTotal.toFixed(2)} / {total > 0 ? total.toFixed(2) : "0.00"}
                            </strong>
                        </div>
                    </section>
                </div>

                <aside className="expense-submit-card">
                    <span className="eyebrow">Ready to save?</span>
                    <h2>{expenseName.trim() || "Your new expense"}</h2>
                    <div className="review-amount">
                        <span>{expenseCurrency?.currencyIso || "Currency"}</span>
                        <strong>{total > 0 ? total.toFixed(2) : "0.00"}</strong>
                    </div>
                    <ul className="review-list">
                        <li className={basicsReady ? "done" : ""}><span /> Details complete</li>
                        <li className={basicsReady && Math.abs(paidTotal - total) < 0.005 ? "done" : ""}><span /> Payers balance</li>
                        <li className={basicsReady && Math.abs(splitTotal - total) < 0.005 ? "done" : ""}><span /> Split balances</li>
                    </ul>
                    {errorMessage && <div className="notice error small">{errorMessage}</div>}
                    <button className="button primary full large" disabled={!canSubmit} onClick={handleAddExpense}>
                        {submitting ? "Adding expense…" : "Add expense"}
                    </button>
                    <p className="privacy-note">Everyone in the group will see this expense.</p>
                </aside>
            </div>

            {showCurrencyPicker && (
                <Modal onClose={() => setShowCurrencyPicker(false)}>
                    <CurrencyPicker onSelect={currency => {
                        setExpenseCurrency(currency)
                        setShowCurrencyPicker(false)
                    }} />
                </Modal>
            )}
        </PageShell>
    )
}

function MemberAmounts({
    members,
    values,
    currency,
    loading,
    onChange,
    actionLabel,
    onAction
}: {
    members: GroupMemberType[]
    values: Record<string, string>
    currency?: string
    loading: boolean
    onChange: (userId: string, value: string) => void
    actionLabel?: string
    onAction?: (userId: string) => void
}) {
    if (loading) return <div className="skeleton-list"><span /><span /></div>

    return (
        <div className="member-amount-list">
            {members.map(member => (
                <div className="member-amount-row" key={member.userId}>
                    <span className="person-avatar">{member.userGroupName.slice(0, 1).toUpperCase()}</span>
                    <strong>{member.userGroupName}</strong>
                    {actionLabel && onAction && (
                        <button className="text-button payer-shortcut" type="button" onClick={() => onAction(member.userId)}>{actionLabel}</button>
                    )}
                    <label className="mini-amount">
                        <span>{currency || "—"}</span>
                        <input
                            aria-label={`${member.userGroupName} amount`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={values[member.userId] ?? ""}
                            onChange={event => onChange(member.userId, event.target.value)}
                            placeholder="0.00"
                        />
                    </label>
                </div>
            ))}
        </div>
    )
}

export default AddExpensePage
