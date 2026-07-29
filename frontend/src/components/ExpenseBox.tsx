import type { ExpenseType } from '../interfaces/interface'

function ExpenseBox({ expense }: { expense: ExpenseType }) {
    const amount = new Intl.NumberFormat("en", {
        style: "currency",
        currency: expense.currency || "SGD"
    }).format(Number(expense.expenseTotal))
    const date = new Intl.DateTimeFormat("en", {
        day: "numeric",
        month: "short"
    }).format(new Date(expense.date))
    const [day, month] = date.split(" ")

    return (
        <article className="expense-row">
            <div className="expense-date">
                <span>{month}</span>
                <strong>{day}</strong>
            </div>
            <div className="expense-copy">
                <strong>{expense.expenseName}</strong>
                <small>Shared expense</small>
            </div>
            <div className="expense-amount">
                <strong>{amount}</strong>
                <small>{expense.currency || "SGD"}</small>
            </div>
        </article>
    )
}

export default ExpenseBox
