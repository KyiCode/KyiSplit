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
    paidBy: Payment[]
    splits: Split[]
}

export interface Payment {
    payer: string
    amount: number
}

export interface Split {
    member: string
    amount: number
}




