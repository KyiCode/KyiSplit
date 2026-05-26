import { useState } from "react"

import type { Group, Expense, Member, Payment, Split, ExpenseBoxProp } from '../interfaces/interface'



function DropDown() {
    const [isOpen, setIsOpen] = useState(false)
}

function ExpenseBox({ expense, handleDelete }: ExpenseBoxProp) {
    const [isAssigningPayee, setIsAssigningPayee] = useState(false)
    const [isAssigningSplits, setIsAssigningSplits] = useState(false)

    return (
        <div>
            <h3>{expense.expenseName} <button onClick={() => handleDelete(expense)}>Delete Expense</button> </h3>
            <h3> total (${expense.expenseTotal.toFixed(2)})</h3>
            <div> Paid By: {expense.paidBy.map(payment => `${payment.payer} (${payment.amount})`).join(", ")} </div>
            <div> Splits: {expense.splits.map(split => `${split.member} (${split.amount})`).join(", ")} </div>

        </div>
    )
}

export default ExpenseBox