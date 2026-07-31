import type { ExpenseType } from '../interfaces/interface'

function ExpenseBox({
    expense,
    onSelect
}: {
    expense: ExpenseType
    onSelect: (expense: ExpenseType) => void
}) {
    const currency = expense.currency || "SGD"
    const amount = `${currency} ${Number(expense.expenseTotal).toFixed(2)}`
    const date = new Date(`${expense.date}T00:00:00.000Z`)
    const day = new Intl.DateTimeFormat("en", {
        day: "numeric",
        timeZone: "UTC"
    }).format(date)
    const month = new Intl.DateTimeFormat("en", {
        month: "short",
        timeZone: "UTC"
    }).format(date)

    return (
        <button
            type="button"
            className="expense-row"
            aria-label={`View details for ${expense.expenseName}`}
            onClick={() => onSelect(expense)}
        >
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
                <small>Original amount</small>
            </div>
        </button>
    )
}

export default ExpenseBox
