import type {
    BalanceData,
    GroupMember
} from "../../../backend/src/contracts/api"

interface BalancePanelProps {
    data: BalanceData | null
    error: string
    loading: boolean
    members: GroupMember[]
    onRetry: () => void
}

function BalancePanel({
    data,
    error,
    loading,
    members,
    onRetry
}: BalancePanelProps) {
    const memberById = new Map(
        members.map(member => [member.userId, member.userGroupName])
    )
    const seenBalanceIds = new Set<string>()
    let integrityMismatch = false

    const balanceRows = data?.balances.map((balance, index) => {
        const duplicate = seenBalanceIds.has(balance.userId)
        seenBalanceIds.add(balance.userId)
        const memberName = memberById.get(balance.userId)
        const amount = Number(balance.amount)
        if (duplicate || !memberName || !Number.isFinite(amount)) {
            integrityMismatch = true
        }
        return {
            key: `${balance.userId}-${index}`,
            memberName: memberName || unknownMember(balance.userId),
            amount: Number.isFinite(amount) ? amount : null
        }
    }) || []

    for (const member of members) {
        if (!seenBalanceIds.has(member.userId)) {
            integrityMismatch = true
            balanceRows.push({
                key: `missing-${member.userId}`,
                memberName: member.userGroupName,
                amount: null
            })
        }
    }

    const settlements = data?.settlements.map((settlement, index) => {
        const payer = memberById.get(settlement.payerUserId)
        const receiver = memberById.get(settlement.receiverUserId)
        const amount = Number(settlement.amount)
        if (
            !payer ||
            !receiver ||
            !Number.isFinite(amount) ||
            amount <= 0
        ) {
            integrityMismatch = true
        }
        return {
            key: `${settlement.payerUserId}-${settlement.receiverUserId}-${index}`,
            payer: payer || unknownMember(settlement.payerUserId),
            receiver: receiver || unknownMember(settlement.receiverUserId),
            amount: Number.isFinite(amount) ? amount : null
        }
    }) || []

    return (
        <section
            className="balance-panel"
            role="region"
            aria-label="Balances"
        >
            <div className="section-heading">
                <div>
                    <span className="eyebrow">Group currency</span>
                    <h2>Balances</h2>
                </div>
                {data && <span className="count-badge">{data.currency}</span>}
            </div>

            {loading && !data && (
                <div
                    className="skeleton-list"
                    role="status"
                    aria-label="Loading balances"
                >
                    <span /><span /><span />
                </div>
            )}

            {error && (
                <div className="notice error small" role="alert">
                    <span>{error}</span>
                    <button onClick={onRetry}>Retry balances</button>
                </div>
            )}

            {data && (
                <>
                    {integrityMismatch && (
                        <div className="notice error small" role="alert">
                            Some balance data does not match the current group
                            members.
                        </div>
                    )}
                    <ul className="balance-list">
                        {balanceRows.map(row => (
                            <li key={row.key} className="balance-row">
                                <strong>{row.memberName}</strong>
                                {row.amount === null ? (
                                    <span className="balance-unavailable">
                                        Balance unavailable
                                    </span>
                                ) : (
                                    <BalanceAmount
                                        amount={row.amount}
                                        currency={data.currency}
                                    />
                                )}
                            </li>
                        ))}
                    </ul>

                    <div className="settlement-heading">
                        <h3>Suggested repayments</h3>
                        <small>Calculated, not recorded</small>
                    </div>
                    {settlements.length === 0 ? (
                        <p className="balance-empty">
                            No repayments needed.
                        </p>
                    ) : (
                        <ol
                            className="settlement-list"
                            aria-label="Settlement suggestions"
                        >
                            {settlements.map(settlement => (
                                <li key={settlement.key}>
                                    <span>
                                        <strong>{settlement.payer}</strong>
                                        {" pays "}
                                        <strong>{settlement.receiver}</strong>
                                    </span>
                                    <strong>
                                        {settlement.amount === null
                                            ? "Amount unavailable"
                                            : formatMoney(
                                                data.currency,
                                                settlement.amount
                                            )}
                                    </strong>
                                </li>
                            ))}
                        </ol>
                    )}
                </>
            )}
        </section>
    )
}

function BalanceAmount({
    amount,
    currency
}: {
    amount: number
    currency: string
}) {
    const label = amount > 0
        ? "Should receive"
        : amount < 0
            ? "Owes"
            : "Settled"
    return (
        <span className={`balance-amount ${
            amount > 0 ? "positive" : amount < 0 ? "negative" : "zero"
        }`}>
            <small>{label}</small>
            <strong>{formatMoney(currency, Math.abs(amount))}</strong>
        </span>
    )
}

function formatMoney(currency: string, amount: number) {
    return `${currency} ${amount.toFixed(2)}`
}

function unknownMember(userId: string) {
    return `Unknown member (${userId})`
}

export default BalancePanel
