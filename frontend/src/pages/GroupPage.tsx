import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import type { Group, ExpenseType, Member, Payment, Split } from '../interfaces/interface'
import ExpenseBox from "../components/ExpenseBox"
import { fetchExpenses } from "../api/expenses"
import { fetchGroup, generateInvite } from "../api/groups"

function GroupPage() {
    const [expenses, setExpenses] = useState<ExpenseType[]>([])
    const { groupId } = useParams()

    const [groupName, setGroupName] = useState("")
    const [expenseName, setExpenseName] = useState("")
    const [expenseTotal, setExpenseTotal] = useState("")

    const [isInvite, setIsInvite] = useState(false)

    const navigate = useNavigate()

    useEffect(() => {
        console.log("GGGG")
        if (groupId) getExpense()
        if (groupId) getGroup()
    }, [groupId])

    async function getGroup() {
        const data = await fetchGroup(groupId!)
        if (data.status == "success") {
            setGroupName(data.groupName)
        }
    }

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

    const [inviteLink, setInviteLink] = useState("")
    async function handleInvite() {
        setIsInvite(true)
        const data = await generateInvite(groupId!)
        if (!data) console.log("invite link generator failed")
        setInviteLink(data.inviteToken)
    }



    return (
        <div>

            <h1>Group Page  <button onClick={() => handleExitGroup()}> Exit group</button></h1>

            <h1>{groupName}</h1>

            {!isInvite && <button onClick={() => handleInvite()}>Invite users</button>}
            {isInvite && <>
                <div>invite link: </div>
                <div>{inviteLink}</div>
                <button onClick={() => setIsInvite(false)}> X </button>
            </>}

            {/* {group.groupMembers.map(member => (<div> {member.memberName} </div>))} */}

            {
                expenses.map(expense => (
                    <div>

                        {/* <ExpenseBox key={expense.expenseName} expense={expense} handleDelete={handleDeleteExpense} /> */}
                        <ExpenseBox key={expense.expenseName} expense={expense} />
                    </div>
                ))
            }
            <button onClick={() => navigate(`/${groupId}/addexpense`)}> Add Expense</button>
        </div >
    )
}

export default GroupPage