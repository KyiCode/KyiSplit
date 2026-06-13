import { useState } from "react"

import type { Group, ExpenseType, Member, Payment, Split } from '../interfaces/interface'



function DropDown() {
    const [isOpen, setIsOpen] = useState(false)
}



function ExpenseBox({ expense }: { expense: ExpenseType }) {
    const [isAssigningPayee, setIsAssigningPayee] = useState(false)
    const [isAssigningSplits, setIsAssigningSplits] = useState(false)

    return (
        <div>
            <h2>{expense.expenseName}</h2>
            <h3> total (${Number(expense.expenseTotal).toFixed(2)})</h3>
            {/* <div> Paid By: {expense.paidBy.map(payment => `${payment.memberName} ($${payment.amount})`).join(", ")} </div>
            <div> Splits: {expense.splits.map(split => `${split.memberName} ($${split.amount})`).join(", ")} </div> */}
            <h2> . </h2>
            <h2> . </h2>

        </div>
    )
}

export default ExpenseBox
