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
            <h2>{expense.expenseName} <button onClick={() => handleDelete(expense)}>Delete Expense</button> </h2>
            {/* <h3> total (${expense.expenseTotal.toFixed(2)})</h3> */}
            {/* <div> Paid By: {expense.paidBy.map(payment => `${payment.memberName} ($${payment.amount})`).join(", ")} </div>
            <div> Splits: {expense.splits.map(split => `${split.memberName} ($${split.amount})`).join(", ")} </div> */}
            <h2> . </h2>
            <h2> . </h2>

        </div>
    )
}

export default ExpenseBox
