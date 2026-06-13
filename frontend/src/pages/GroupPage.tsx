import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import type { Group, ExpenseType, Member, Payment, Split } from '../interfaces/interface'
import ExpenseBox from "../components/ExpenseBox"
import { fetchExpenses } from "../api/expenses"

function GroupPage() {
    const [expenses, setExpenses] = useState<ExpenseType[]>([])
    const { groupId } = useParams()
    const [expenseName, setExpenseName] = useState("")
    const [expenseTotal, setExpenseTotal] = useState("")

    const navigate = useNavigate()

    useEffect(() => {
        console.log("GGGG")
        if (groupId) getExpense()
    }, [groupId])

    async function getExpense() {
        const data = await fetchExpenses(groupId!)
        if (data.status == "success") {
            setExpenses(data.mappedExpenses)
        }
    }

    function handleExitGroup() {
        navigate("/")
    }

    function handleAddExpense() {
        // if (newExpense.expenseName == "" || newExpense.expenseTotal < 0) return
        setExpenseName("")
        setExpenseTotal("")
        // setExpenses([...expenses, newExpense])
    }

    function handleDeleteExpense(expense: ExpenseType) {
        setExpenses(expenses.filter(e => e.expenseName != expense.expenseName))
    }

    return (
        <div>
            <h1>Group Page</h1>
            <button onClick={() => handleExitGroup()}> Exit group</button>

            {/* {group.groupMembers.map(member => (<div> {member.memberName} </div>))} */}

            {expenses.map(expense => (
                <div>

                    {/* <ExpenseBox key={expense.expenseName} expense={expense} handleDelete={handleDeleteExpense} /> */}
                    <ExpenseBox key={expense.expenseName} expense={expense} />
                </div>
            ))}
            <button onClick={() => navigate(`/${groupId}/addexpense`)}> Add Expense</button>
        </div>
    )
}

export default GroupPage