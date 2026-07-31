export function parseBoundedName(
    value: unknown,
    maximumLength: number
): string | null {
    if (typeof value !== "string") return null

    const normalized = value.trim()
    if (normalized.length === 0 || normalized.length > maximumLength) {
        return null
    }

    return normalized
}

export function parseCurrencyCode(value: unknown): string | null {
    if (typeof value !== "string" || !/^[A-Z]{3}$/.test(value)) {
        return null
    }
    return value
}
