export interface Group {
    groupId: string,
    groupName: string
    groupMembers: GroupMemberType[]
}

// interfaces/interface.ts
export interface ExpenseType {
    expenseId: string,
    groupId: string,
    expenseName: string,
    expenseTotal: string,
    date: string,
    createdAt: string,
    currency: string | null
}

export interface CurrencyType {
    currencyIso: string,
    currencyName: string
}

export interface ExpenseMemberAmount {
    userId: string
    amount: number
}

export interface GroupMemberType {
    userId: string,
    userGroupName: string
}

export type Payment = ExpenseMemberAmount
export type Split = ExpenseMemberAmount
