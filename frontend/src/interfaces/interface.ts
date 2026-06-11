export interface Member {
    memberName: string
    memberEmail: string
}

export interface Group {
    groupName: string
    groupMembers: Member[]
    expenses: Expense[]
}

export interface Expense {
    expenseName: string
    expenseTotal: number
    paidBy: Payment[]
    splits: Split[]
}

export interface ExpenseMemberAmount {
    memberName: string
    amount: number
}

export interface Payment extends ExpenseMemberAmount {
 
}

export interface Split extends ExpenseMemberAmount {
}



export interface ExpenseBoxProp {
    expense: Expense
    handleDelete: (expense: Expense) => void
}
