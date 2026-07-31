import type {
    ExpenseSummary,
    GroupMember,
    GroupSummary
} from "../../../backend/src/contracts/api"

export type Group = GroupSummary
export type ExpenseType = ExpenseSummary

export interface CurrencyType {
    currencyIso: string,
    currencyName: string
}

export interface ExpenseMemberAmount {
    userId: string
    amount: number
}

export type GroupMemberType = GroupMember

export type Payment = ExpenseMemberAmount
export type Split = ExpenseMemberAmount
