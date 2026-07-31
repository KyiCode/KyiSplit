import { parseMoneyToCents } from "./expenseValidation"

const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export interface ValidatedRepaymentInput {
    payerUserId: string
    receiverUserId: string
    amount: string
    amountCents: number
    repaymentDate: string
}

export function isUuid(value: unknown): value is string {
    return typeof value === "string" && UUID_PATTERN.test(value)
}

function isCalendarDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
    const date = new Date(`${value}T00:00:00.000Z`)
    return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
    )
}

export function parseRepaymentInput(
    input: unknown
): ValidatedRepaymentInput | null {
    if (!input || typeof input !== "object") return null

    const {
        payerUserId,
        receiverUserId,
        amount,
        repaymentDate
    } = input as Record<string, unknown>
    if (
        !isUuid(payerUserId) ||
        !isUuid(receiverUserId) ||
        payerUserId === receiverUserId ||
        typeof amount !== "string" ||
        typeof repaymentDate !== "string" ||
        !isCalendarDate(repaymentDate)
    ) {
        return null
    }

    const amountCents = parseMoneyToCents(amount)
    if (amountCents === null || amountCents <= 0) return null

    return {
        payerUserId,
        receiverUserId,
        amount: (amountCents / 100).toFixed(2),
        amountCents,
        repaymentDate
    }
}
