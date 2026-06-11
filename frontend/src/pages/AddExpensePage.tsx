import { useState } from "react"
import { useNavigate } from "react-router-dom"

import ExpenseBox from "../components/ExpenseBox"
import DropDownForm from "../components/DropDownForm"

import type { Group, Expense, Member, Payment, Split, ExpenseBoxProp, ExpenseMemberAmount } from '../interfaces/interface'

const member1: Member = { memberName: "tom", memberEmail: "tom@email.com" }
const member2: Member = { memberName: "claire", memberEmail: "claire@email.com" }
const member3: Member = { memberName: "sheldon", memberEmail: "sheldon@email.com" }
const member4: Member = { memberName: "leonard", memberEmail: "leonard@email.com" }


const group: Group = {
    groupName: "group1",
    groupMembers: [member1, member2, member3, member4],
    expenses: []
}

function AddExpensePage({ addExpense }: { addExpense: (expense: Expense) => void }) {  // BackEnd have to somehow pass groupdetails
    const [hasExpense, setHasExpense] = useState(false)
    const [expense, setExpense] = useState<Expense | null>(null)
    const [expenseName, setExpenseName] = useState("")
    const [expenseTotal, setExpenseTotal] = useState("")
    const navigate = useNavigate()

    const [isAssigningPayer, setIsAssigningPayer] = useState(false)
    const [isAssigningSplit, setIsAssigningSplit] = useState(false)

    function handleDeleteExpense() {
        setHasExpense(false)
        setExpense(null)
        setExpenseName("")
        setExpenseTotal("")
    }

    function handleAddExpenseDetails() {
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

    function handleAddExpense() {
        if (expense) {
            addExpense(expense)
            navigate("/group")
        }
    }

    function handleAssignPayer(expenseMemberAmount: ExpenseMemberAmount[]) {
        const newExpense: Expense = {
            expenseName: expenseName,
            expenseTotal: Number(expenseTotal),
            splits: expense == null ? [] : expense.splits,
            paidBy: expenseMemberAmount
        }
        setExpense(newExpense)
        setIsAssigningPayer(false)
    }

    function handleAssignSplit(expenseMemberAmount: ExpenseMemberAmount[]) {
        const newExpense: Expense = {
            expenseName: expenseName,
            expenseTotal: Number(expenseTotal),
            splits: expenseMemberAmount,
            paidBy: expense == null ? [] : expense.paidBy
        }
        setExpense(newExpense)
        setIsAssigningSplit(false)
    }

    return (
        <>
            <h1>Add Expense</h1>
            <button onClick={() => navigate("/group")}> Back </button>

            {expense && <ExpenseBox expense={expense} handleDelete={(expense) => handleDeleteExpense()} />}

            <h1>
                <input type="text" value={expenseName} onChange={(e) => setExpenseName(e.target.value)} placeholder="Enter description" />
                <input type="number" value={expenseTotal ?? ""} onChange={(e) => setExpenseTotal(e.target.value)} placeholder="Enter amount" />
                <button onClick={() => handleAddExpenseDetails()}>Submit</button>
            </h1>

            {hasExpense &&
                <>
                    <button onClick={() => setIsAssigningPayer(!isAssigningPayer)}>Assign payer</button>
                    {isAssigningPayer &&
                        <DropDownForm group={group} assignPayer={handleAssignPayer} />
                    }
                </>
            }

            {hasExpense &&
                <>
                    <button onClick={() => setIsAssigningSplit(!isAssigningSplit)}>Assign split</button>
                    {isAssigningSplit &&
                        <DropDownForm group={group} assignPayer={handleAssignSplit} />
                    }
                </>
            }

            {
                hasExpense &&
                <button onClick={() => handleAddExpense()}>Add Expense</button>
            }
        </>
    )

}

export default AddExpensePage 