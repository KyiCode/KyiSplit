import { useState } from "react"

import type { Group, Expense, Member, Payment, Split } from '../interfaces/interface'








function ExpenseBox({ expense }: { expense: Expense }) {
    const [isAssigningPayee, setIsAssigningPayee] = useState(false)
    const [isAssigningMember, setIsAssigningMember] = useState(false)

    return (
        <div>
            <h3>{expense.expenseName}</h3>
            <div> Paid By: {expense.paidBy.map(payment => `${payment.payer} (${payment.amount})`).join(", ")} </div>
            <div> Splits: {expense.splits.map(split => `${split.member} (${split.amount})`).join(", ")} </div>


            <div>
                {isAssigningPayee ?
                    <button onClick={() => setIsAssigningPayee(!isAssigningPayee)}> Assign Payee</button>
                    :
                    <>


                        <button onClick={() => setIsAssigningPayee(!isAssigningPayee)}> Done</button>
                    </>
                }
            </div>

            <div>
                {isAssigningMember ?
                    <button onClick={() => setIsAssigningMember(!isAssigningMember)}> Assign Member</button>
                    :
                    <button onClick={() => setIsAssigningMember(!isAssigningMember)}> Done</button>
                }
            </div>
        </div>
    )
}

export default ExpenseBox