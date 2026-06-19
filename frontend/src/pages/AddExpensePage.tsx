import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import Modal from "../components/Modal"

import type { GroupMemberType, CurrencyType } from '../interfaces/interface'
import CurrencyPicker from "../components/CurrencyPicker"
import DatePicker from "../components/DatePicker"
import { fetchGroupMembers } from "../api/groups";
import { createExpense } from "../api/expenses"

function AddExpensePage() {  // BackEnd have to somehow pass groupdetails
    const { groupId } = useParams()
    if (!groupId) {
        console.log("addexpense no gid in params")
        return
    }


    const [groupMembers, setGroupMembers] = useState<GroupMemberType[]>([])

    const [hasExpense, setHasExpense] = useState(false)

    const [showCurrencyPicker, setShowCurrencyPicker] = useState(false)

    const [expenseName, setExpenseName] = useState("")
    const [expenseTotal, setExpenseTotal] = useState("")
    const [expenseCurrency, setExpenseCurrency] = useState<CurrencyType>()
    const [expenseDate, setExpenseDate] = useState("")


    const [hasCurrency, setHasCurrency] = useState(false)

    const navigate = useNavigate()

    const [isAssigningPayer, setIsAssigningPayer] = useState(false)
    const [isAssigningSplit, setIsAssigningSplit] = useState(false)

    useEffect(() => {
        if (isValidExpense() && hasCurrency) {
            getMembers()
            setHasExpense(true)
        } else {
            console.log("no or invalid expense")
            setHasExpense(false)
        }
    }, [expenseName, expenseTotal, hasCurrency])


    function isValidExpense() {
        return (
            expenseName.trim() !== "" &&
            expenseTotal.trim() !== "" &&
            !isNaN(Number(expenseTotal)) &&
            Number(expenseTotal) > 0
        );
    }

    async function getMembers() {
        const data = await fetchGroupMembers(groupId!)
        if (data.status = "success") setGroupMembers(data)
    }

    function handleSelectCurrency(currency: CurrencyType) {
        setExpenseCurrency(currency)
        setShowCurrencyPicker(false)
        setHasCurrency(true)
    }

    const [amountPaid, setAmountPaid] = useState<Record<string, number>>({});
    const [amountSplit, setAmountSplit] = useState<Record<string, number>>({});

    const handleAmountPaidChange = (userId: string, value: string) => {
        const amount = Number(value)
        if (amount < 0 || Number.isNaN(amount)) return

        setAmountPaid(prev => ({
            ...prev,
            [userId]: amount || 0
        }));
    };

    const handleAmountSplitChange = (userId: string, value: string) => {
        const amount = Number(value)
        if (amount < 0 || Number.isNaN(amount)) return
        setAmountSplit(prev => ({
            ...prev,
            [userId]: amount || 0
        }));
    };


    const [hasError, setHasError] = useState(false)
    const [errorMessage, setErrorMessage] = useState("")

    async function handleAddExpense() {
        const data = await createExpense(groupId!, expenseName, expenseTotal, expenseDate, expenseCurrency!.currencyIso, amountPaid, amountSplit)
        console.log(data)
        if (data.status == "success") {
            navigate(`/group/${groupId}`)
        } else {
            setErrorMessage(data.message)
            setHasError(true)
            setTimeout(() => { setHasError(false) }, 3000)
        }
    }

    return (
        <>
            <h1>Add Expense</h1>
            <button onClick={() => navigate(`/group/${groupId}`)}> Back </button>

            {/* {expense && <ExpenseBox expense={expense} handleDelete={(expense) => handleDeleteExpense()} />} */}

            <h2>
                <input type="text" value={expenseName} onChange={(e) => setExpenseName(e.target.value)} placeholder="Enter description" />

                <input type="number" value={expenseTotal ?? ""} onChange={(e) => setExpenseTotal(e.target.value)} placeholder="Enter amount" />

                <button onClick={() => setShowCurrencyPicker(true)} >currency</button>
                {hasCurrency && <div>{expenseCurrency?.currencyIso}</div>}

                <DatePicker onChange={setExpenseDate}></DatePicker>

            </h2>

            {showCurrencyPicker && (
                <Modal onClose={() => setShowCurrencyPicker(false)}>
                    <CurrencyPicker onSelect={(c) => handleSelectCurrency(c)} />
                </Modal>
            )}

            {hasExpense &&
                <>
                    <button onClick={() => setIsAssigningPayer(!isAssigningPayer)}>Assign payer</button>
                    {isAssigningPayer &&
                        <div>
                            console.log("groupMembers:", groupMembers)
                            {groupMembers.map(member =>
                                <div>
                                    {member.userGroupName} <input type="number" value={amountPaid[member.userId]} onChange={(e) => handleAmountPaidChange(member.userId, e.target.value)} placeholder=" amount"></input>
                                </div>)}
                        </div >
                    }

                    <button onClick={() => setIsAssigningSplit(!isAssigningSplit)}>Assign split</button>
                    {isAssigningSplit &&
                        <div>
                            {groupMembers.map(member =>
                                <div>
                                    {member.userGroupName} <input type="number" value={amountSplit[member.userId]} onChange={(e) => handleAmountSplitChange(member.userId, e.target.value)} placeholder=" amount"></input>
                                </div>)}
                        </div >
                    }

                    <button onClick={() => handleAddExpense()}>Add Expense</button>
                </>

            }

            {hasError && <div>{errorMessage}</div>}
        </>
    )

}

export default AddExpensePage 