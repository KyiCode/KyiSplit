import { use, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import ExpenseBox from "../components/ExpenseBox"
import DropDownForm from "../components/DropDownForm"
import Modal from "../components/Modal"

import type { Group, ExpenseType, Member, Payment, Split, ExpenseMemberAmount, CurrencyType } from '../interfaces/interface'
import { createExpense } from "../api/expenses"
import CurrencyPicker from "../components/CurrencyPicker"
import DatePicker from "../components/DatePicker"


function AddExpensePage() {  // BackEnd have to somehow pass groupdetails
    const { groupId } = useParams()
    if (!groupId) console.log("addexpense no gid in params")

    const [hasExpense, setHasExpense] = useState(false)
    const [expense, setExpense] = useState<ExpenseType | null>(null)

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
        if (isValidExpense(expenseName, expenseTotal) && hasCurrency) {
            setHasExpense(true)
        } else {
            setHasExpense(false)
        }
    }, [expenseName, expenseTotal, hasCurrency])


    function isValidExpense(expenseName: string, expenseTotal: string) {
        return (
            expenseName.trim() !== "" &&
            expenseTotal.trim() !== "" &&
            !isNaN(Number(expenseTotal)) &&
            Number(expenseTotal) > 0
        );
    }

    function handleSelectCurrency(currency: CurrencyType) {
        setExpenseCurrency(currency)
        setShowCurrencyPicker(false)
        setHasCurrency(true)
    }

    function handleAddExpense() {

    }
    return (
        <>
            <h1>Add Expense</h1>
            <button onClick={() => navigate(`/group/${groupId}`)}> Back </button>

            {/* {expense && <ExpenseBox expense={expense} handleDelete={(expense) => handleDeleteExpense()} />} */}

            <h2>
                <input type="text" value={expenseName} onChange={(e) => setExpenseName(e.target.value)} placeholder="Enter description" />
            </h2>

            <h2>
                <input type="number" value={expenseTotal ?? ""} onChange={(e) => setExpenseTotal(e.target.value)} placeholder="Enter amount" />
            </h2>

            <h2>
                <button onClick={() => setShowCurrencyPicker(true)} >currency</button>
                {hasCurrency && <div>{expenseCurrency?.currencyIso}</div>}
            </h2>

            {showCurrencyPicker && (
                <Modal onClose={() => setShowCurrencyPicker(false)}>
                    <CurrencyPicker onSelect={(c) => handleSelectCurrency(c)} />
                </Modal>
            )}

            {/* <CurrencyPicker></CurrencyPicker> */}

            {/* <h2>
                <input type="text" value={expenseCurrency ?? ""} onChange={(e) => setExpenseDate(e.target.value)} placeholder="Enter currency" />
            </h2> */}
            <h2>
                <DatePicker onChange={setExpenseDate}></DatePicker>
            </h2>


            {hasExpense &&
                <>
                    <button onClick={() => setIsAssigningPayer(!isAssigningPayer)}>Assign payer</button>
                    {isAssigningPayer &&
                        <DropDownForm groupId={groupId!} assignPayer={handleAssignPayer} />
                    }
                </>
            }

            {hasExpense &&
                <>
                    <button onClick={() => setIsAssigningSplit(!isAssigningSplit)}>Assign split</button>
                    {/* {isAssigningSplit &&
                        // <DropDownForm group={group} assignPayer={handleAssignSplit} />
                    } */}
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