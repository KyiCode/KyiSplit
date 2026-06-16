import { useEffect, useState } from "react";

import { type Group, type Member, type Payment, type Split, type ExpenseMemberAmount, type GroupMemberType } from '../interfaces/interface'
import { fetchGroupMembers } from "../api/groups";

// function DropDownForm({ groupId, assignPayer }: { groupId: string, assignPayer: (expenseMemberAmount: ExpenseMemberAmount[]) => void }) {
function DropDownForm({ groupId }: { groupId: string }) {

    const [groupMembers, setGroupMembers] = useState<GroupMemberType[]>([])

    useEffect(() => {
        getMembers()
    }, [])

    async function getMembers() {
        const data = await fetchGroupMembers(groupId)
        if (data.status = "success") setGroupMembers(data)
    }

    // const [expenseData, setExpenseData] = useState<Record<string, number>>(
    //     Object.fromEntries(group.groupMembers.map(member => [member.memberName, 0]))
    // )

    // function handleAmountChange(memberName: string, memberAmount: string) {
    //     let amount = memberAmount == "" ? 0 : Number(memberAmount)
    //     setExpenseData({
    //         ...expenseData,
    //         [memberName]: amount
    //     })
    // }

    // function handleDone() {
    //     const result: ExpenseMemberAmount[] = Object.entries(expenseData)
    //         .filter(([memberName, memberAmount]) => memberAmount > 0)
    //         .map(([memberName, memberAmount]) => { return { memberName: memberName, amount: memberAmount } })
    //     assignPayer(result)
    // }

    return (
        <div>
            {groupMembers.map(member =>
                <div>
                    {member.userGroupName} <input placeholder=" amount"></input>
                    {/* <input placeholder="0" onChange={(e) => handleAmountChange(member.memberName, e.target.value)} ></input> */}
                </div>)}
            {/* < button onClick={() => handleDone()}>Done</button> */}
        </div >
    )
}

export default DropDownForm