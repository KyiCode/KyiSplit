import { useState } from "react";

import type { Group, Expense, Member, Payment, Split, ExpenseBoxProp } from '../interfaces/interface'

function DropDownForm({ group, assignPayer }: { group: Group, assignPayer: (payments: Payment[]) => void }) {

    const [expenseData, setExpenseData] = useState<Record<string, number>>(
        Object.fromEntries(group.groupMembers.map(member => [member.memberName, 0]))
    )

    function handleAmountChange(memberName: string, memberAmount: string) {
        let amount = memberAmount == "" ? 0 : Number(memberAmount)
        setExpenseData(
            {
                ...expenseData,
                [memberName]: amount
            }
        )
    }

    function handleDone() {
        const result : Payment[] = Object.entries(expenseData)
            .filter(([memberName, memberAmount] )=> memberAmount > 0)
            .map(([memberName, memberAmount]) => {return {payer : memberName, amount : memberAmount}})
        assignPayer(result)
    }

    return (
        <div>
            {group.groupMembers.map(member =>
                <div>
                    {member.memberName}
                    <input onChange={(e) => handleAmountChange(member.memberName, e.target.value)} ></input>
                </div>)}
            < button onClick={() => handleDone()}>Done</button>

        </div >
    )
}

export default DropDownForm