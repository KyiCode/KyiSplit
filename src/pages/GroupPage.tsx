import { useState } from "react"
import { useNavigate } from "react-router-dom"
import type { Group, Expense, Member, Payment, Split } from '../interfaces/interface'
import ExpenseBox from "../components/ExpenseBox"

const member1: Member = { memberName: "tom", memberEmail: "tom@email.com" }
const member2: Member = { memberName: "claire", memberEmail: "claire@email.com" }
const member3: Member = { memberName: "sheldon", memberEmail: "sheldon@email.com" }
const member4: Member = { memberName: "leonard", memberEmail: "leonard@email.com" }



const sampleExpense1: Expense = {

    expenseName: "Dinner",
    paidBy: [
        { payer: "tom", amount: 40 },
    ],
    splits: [
        { member: "tom", amount: 20 },
        { member: "claire", amount: 20 },
    ]
}

const sampleExpense2: Expense = {
    expenseName: "Movie",
    paidBy: [
        { payer: "claire", amount: 30 },
    ],
    splits: [
        { member: "tom", amount: 15 },
        { member: "claire", amount: 15 },
    ]
}

const group: Group = {
    groupName: "group1",
    groupMembers: [member1, member2, member3, member4],
    expenses: [sampleExpense1, sampleExpense2]
}

function GroupPage() {
    const [expenses, setExpenses] = useState<Expense[]>(group.expenses)

    const navigate = useNavigate()

    function handleExitGroup() {
        alert("Exiting group")
        navigate("/")
    }

    return (
        <div>
            <h1>Group Page</h1>
            <button onClick={() => handleExitGroup()}> Exit group</button>

            {group.groupMembers.map(member => (<div> {member.memberName} </div>))}

            {expenses.map(expense => (
                <ExpenseBox key={expense.expenseName} expense={expense} />
            ))}


            <div>
                <input type="text" placeholder="Enter expense name" />
                <input type="number" placeholder="Enter amount" />
                <button> Add Expense</button>
            </div>
        </div>
    )
}

export default GroupPage