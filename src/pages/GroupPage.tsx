import { useNavigate } from "react-router-dom"


interface Member {
    memberName: string
    memberEmail: string
}

interface Expense {
    expenseName: string
    expenseAmount: number
    assignedMembers: Member[]
}

interface GroupExpenseProps {
    expenses: Expense[]
}



function GroupPage() {
    const navigate = useNavigate()

    function handleExitGroup() {
        alert("Exiting group")
        navigate("/")
    }

    return (
        <div>
            <h1>Group Page</h1>
            <button onClick={() => handleExitGroup()}> Exit group</button>




            <div>
                <input type="text" placeholder="Enter expense name" />
                <input type="number" placeholder="Enter amount" />
                <button> Add Expense</button>
            </div>
        </div>
    )
}

export default GroupPage