import { useState } from "react";

import type { Group, Member, Payment, Split, ExpenseBoxProp, ExpenseMemberAmount } from '../interfaces/interface'

function DropDownForm({ groupId, assignPayer }: { groupId: string, assignPayer: (expenseMemberAmount: ExpenseMemberAmount[]) => void }) {



    const [expenseData, setExpenseData] = useState<Record<string, number>>(
        Object.fromEntries(group.groupMembers.map(member => [member.memberName, 0]))
    )

    function handleAmountChange(memberName: string, memberAmount: string) {
        let amount = memberAmount == "" ? 0 : Number(memberAmount)
        setExpenseData({
            ...expenseData,
            [memberName]: amount
        })
    }

    function handleDone() {
        const result: ExpenseMemberAmount[] = Object.entries(expenseData)
            .filter(([memberName, memberAmount]) => memberAmount > 0)
            .map(([memberName, memberAmount]) => { return { memberName: memberName, amount: memberAmount } })
        assignPayer(result)
    }

    return (
        <div>
            {group.groupMembers.map(member =>
                <div>
                    {member.memberName}
                    <input placeholder="0" onChange={(e) => handleAmountChange(member.memberName, e.target.value)} ></input>
                </div>)}
            < button onClick={() => handleDone()}>Done</button>
        </div >
    )
}

export default DropDownForm