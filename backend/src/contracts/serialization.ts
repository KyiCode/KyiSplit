import type {
    CalendarDate,
    MoneyString,
    UtcTimestamp
} from "./api"

export function serializeMoney(value: unknown): MoneyString {
    const amount = Number(value)
    if (!Number.isFinite(amount)) {
        throw new Error("Cannot serialize invalid money")
    }
    return amount.toFixed(2)
}

export function serializeDate(value: unknown): CalendarDate {
    if (value instanceof Date) {
        return value.toISOString().slice(0, 10)
    }
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        return value.slice(0, 10)
    }
    throw new Error("Cannot serialize invalid date")
}

export function serializeTimestamp(value: unknown): UtcTimestamp {
    const date = value instanceof Date ? value : new Date(String(value))
    if (Number.isNaN(date.getTime())) {
        throw new Error("Cannot serialize invalid timestamp")
    }
    return date.toISOString()
}
