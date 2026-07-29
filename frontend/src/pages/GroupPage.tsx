import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import ExpenseBox from "../components/ExpenseBox"
import PageShell from "../components/PageShell"
import { fetchExpenses } from "../api/expenses"
import { fetchGroup, fetchGroupMembers, generateInvite } from "../api/groups"
import type { ExpenseType, GroupMemberType } from "../interfaces/interface"

function GroupPage() {
    const [expenses, setExpenses] = useState<ExpenseType[]>([])
    const [members, setMembers] = useState<GroupMemberType[]>([])
    const [groupName, setGroupName] = useState("")
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [inviteLink, setInviteLink] = useState("")
    const [inviteLoading, setInviteLoading] = useState(false)
    const [copied, setCopied] = useState(false)
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
            if (groupData.status === "success") setGroupName(groupData.groupName)
            else setError(groupData.message || "Unable to open this group.")
            if (expenseData.status === "success") setExpenses(expenseData.mappedExpenses)
            if (Array.isArray(memberData)) setMembers(memberData)
        }).catch(() => active && setError("We couldn't load this group."))
            .finally(() => active && setLoading(false))

        return () => { active = false }
    }, [groupId])

    async function handleInvite() {
        if (!groupId) return
        setInviteLoading(true)
        setError("")
        try {
            const data = await generateInvite(groupId)
            if (data.status === "success") setInviteLink(data.inviteToken)
            else setError(data.message || "Unable to create an invite.")
        } catch {
            setError("Unable to create an invite right now.")
        } finally {
            setInviteLoading(false)
        }
    }

    async function copyInvite() {
        await navigator.clipboard.writeText(inviteLink)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1800)
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

            {error && <div className="notice error">{error}</div>}

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
                <div className="expense-panel">
                    <div className="section-heading">
                        <div>
                            <span className="eyebrow">Activity</span>
                            <h2>Recent expenses</h2>
                        </div>
                    </div>
                    {loading ? (
                        <div className="skeleton-list"><span /><span /><span /></div>
                    ) : expenses.length > 0 ? (
                        <div className="expense-list">
                            {expenses.map(expense => <ExpenseBox key={expense.expenseId} expense={expense} />)}
                        </div>
                    ) : (
                        <div className="empty-state compact-empty">
                            <span className="empty-mark">+</span>
                            <h3>Nothing split yet</h3>
                            <p>Add the first expense and KyiSplit will keep the maths tidy.</p>
                        </div>
                    )}
                </div>

                <aside className="members-panel">
                    <span className="eyebrow">People</span>
                    <h2>In this group</h2>
                    <div className="people-list">
                        {members.map(member => (
                            <div className="person-row" key={member.userId}>
                                <span className="person-avatar">{member.userGroupName.slice(0, 1).toUpperCase()}</span>
                                <strong>{member.userGroupName}</strong>
                            </div>
                        ))}
                    </div>
                </aside>
            </section>
        </PageShell>
    )
}

export default GroupPage
