export interface Member {
    memberName: string
    memberEmail: string
}

export interface Group {
    groupId: string,
    groupName: string
    groupMembers: Member[]
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
    memberName: string
    amount: number
}

export interface GroupMemberType {
    userId: string,
    userGroupName: string
}

export interface Payment extends ExpenseMemberAmount {

}

export interface Split extends ExpenseMemberAmount {
}



// export interface ExpenseBoxProp {
//     expense: Expense
//     handleDelete: (expense: Expense) => void
// }
