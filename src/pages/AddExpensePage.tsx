import { useState } from "react"
import { useNavigate } from "react-router-dom"

import ExpenseBox from "../components/ExpenseBox"
import DropDownForm from "../components/DropDownForm"

import type { Group, Expense, Member, Payment, Split, ExpenseBoxProp } from '../interfaces/interface'

const member1: Member = { memberName: "tom", memberEmail: "tom@email.com" }
const member2: Member = { memberName: "claire", memberEmail: "claire@email.com" }
const member3: Member = { memberName: "sheldon", memberEmail: "sheldon@email.com" }
const member4: Member = { memberName: "leonard", memberEmail: "leonard@email.com" }


const group: Group = {
    groupName: "group1",
    groupMembers: [member1, member2, member3, member4],
    expenses: []
}

function AddExpensePage() {  // BackEnd have to somehow pass groupdetails
    const [hasExpense, setHasExpense] = useState(false)
    const [expense, setExpense] = useState<Expense | null>(null)
    const [expenseName, setExpenseName] = useState("")
    const [expenseTotal, setExpenseTotal] = useState("")
    const navigate = useNavigate()

    const [isSettingPayer, setIsSettingPayer] = useState(false)


    function handleDeleteExpense() {
        setHasExpense(false)
        setExpense(null)
        setExpenseName("")
        setExpenseTotal("")
    }

    function handleAddExpense() {
        if (expenseName == "" || expenseTotal == "") {
            return
        }
        setHasExpense(true)
        const newExpense: Expense = {
            expenseName: expenseName,
            expenseTotal: Number(expenseTotal),
            splits: [],
            paidBy: []
        }
        setExpense(newExpense)
    }

    function handleAssignPayer() {

    }

    return (
        <>
            <h1>Add Expense</h1>
            <button onClick={() => navigate("/group")}> Back </button>

            {expense && <ExpenseBox expense={expense} handleDelete={(expense) => handleDeleteExpense()} />}

            <h1>
                <input type="text" value={expenseName} onChange={(e) => setExpenseName(e.target.value)} placeholder="Enter description" />
                <input type="number" value={expenseTotal ?? ""} onChange={(e) => setExpenseTotal(e.target.value)} placeholder="Enter amount" />
                <button onClick={() => handleAddExpense()}>Submit</button>
            </h1>

            {hasExpense &&
                <>
                    <button onClick={() => setIsSettingPayer(true)}>Paid BY</button>
                    {isSettingPayer &&
                        <>
                            <DropDownForm group={group} assignPayer={handleAssignPayer} />
                            
                        </>
                    }
                </>
            }
        </>
    )

}

export default AddExpensePage 