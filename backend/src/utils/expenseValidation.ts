export interface ValidatedExpenseEntry {
    userId: string
    amount: number
    amountCents: number
}

export interface ValidatedExpenseInput {
    groupId: string
    expenseName: string
    expenseTotal: number
    expenseTotalCents: number
    expenseDate: string
    expenseCurrency: string
    paidBy: ValidatedExpenseEntry[]
    splits: ValidatedExpenseEntry[]
}

type ExpenseValidationResult =
    | { ok: true, value: ValidatedExpenseInput }
    | { ok: false, message: string }

export function parseMoneyToCents(value: unknown): number | null {
    if (typeof value === "string") {
        const normalized = value.trim()
        if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null
        const [whole, fraction = ""] = normalized.split(".")
        if (whole.length > 14) return null
        const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"))
        if (cents > BigInt(Number.MAX_SAFE_INTEGER)) return null
        return Number(cents)
    }

    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        return null
    }

    const cents = Math.round(value * 100)
    if (!Number.isSafeInteger(cents) || cents / 100 !== value) return null

    return cents
}

function isCalendarDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

    const date = new Date(`${value}T00:00:00.000Z`)
    return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
    )
}

function parseEntries(value: unknown): ValidatedExpenseEntry[] | null {
    if (!Array.isArray(value) || value.length === 0) return null

    const entries: ValidatedExpenseEntry[] = []
    const userIds = new Set<string>()
    for (const item of value) {
        if (!item || typeof item !== "object") return null

        const { userId, amount } = item as Record<string, unknown>
        if (typeof userId !== "string") return null

        const normalizedUserId = userId.trim()
        const amountCents = parseMoneyToCents(amount)
        if (
            normalizedUserId.length === 0 ||
            amountCents === null ||
            userIds.has(normalizedUserId)
        ) {
            return null
        }

        userIds.add(normalizedUserId)
        entries.push({
            userId: normalizedUserId,
            amount: amountCents / 100,
            amountCents
        })
    }

    return entries
}

export function parseExpenseInput(input: unknown): ExpenseValidationResult {
    if (!input || typeof input !== "object") {
        return { ok: false, message: "Invalid expense details" }
    }

    const body = input as Record<string, unknown>
    const groupId = typeof body.groupId === "string"
        ? body.groupId.trim()
        : ""
    const expenseName = typeof body.expenseName === "string"
        ? body.expenseName.trim()
        : ""
    const expenseDate = typeof body.expenseDate === "string"
        ? body.expenseDate
        : ""
    const expenseCurrency = typeof body.expenseCurrency === "string"
        ? body.expenseCurrency.trim().toUpperCase()
        : ""
    const expenseTotalCents = parseMoneyToCents(body.expenseTotal)

    if (
        groupId.length === 0 ||
        expenseName.length === 0 ||
        expenseName.length > 120 ||
        !isCalendarDate(expenseDate) ||
        !/^[A-Z]{3}$/.test(expenseCurrency) ||
        expenseTotalCents === null ||
        expenseTotalCents <= 0
    ) {
        return { ok: false, message: "Invalid expense details" }
    }

    const paidBy = parseEntries(body.paidBy)
    const splits = parseEntries(body.splits)
    if (!paidBy || !splits) {
        return {
            ok: false,
            message: "Invalid payer or split entries"
        }
    }

    const paidCents = paidBy.reduce(
        (total, entry) => total + entry.amountCents,
        0
    )
    const splitCents = splits.reduce(
        (total, entry) => total + entry.amountCents,
        0
    )
    if (
        !Number.isSafeInteger(paidCents) ||
        !Number.isSafeInteger(splitCents) ||
        paidCents !== expenseTotalCents ||
        splitCents !== expenseTotalCents
    ) {
        return {
            ok: false,
            message: "Paid and split amounts must equal total"
        }
    }

    return {
        ok: true,
        value: {
            groupId,
            expenseName,
            expenseTotal: expenseTotalCents / 100,
            expenseTotalCents,
            expenseDate,
            expenseCurrency,
            paidBy,
            splits
        }
    }
}
