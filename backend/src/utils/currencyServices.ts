import { logger } from "../logging/logger"

type Environment = Record<string, string | undefined>

export interface FxQuote {
    rate: string
    provider: string
    effectiveAt: string | null
}

export class FxUnavailableError extends Error {
    constructor(message = "Exchange rate is unavailable") {
        super(message)
        this.name = "FxUnavailableError"
    }
}

export class DataIntegrityError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "DataIntegrityError"
    }
}

function parseEffectiveAt(value: unknown): string | null {
    if (value === undefined || value === null) return null
    if (typeof value !== "string") {
        throw new FxUnavailableError()
    }

    const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? new Date(`${value}T00:00:00.000Z`)
        : new Date(value)
    if (Number.isNaN(date.getTime())) {
        throw new FxUnavailableError()
    }
    return date.toISOString()
}

export function validateFxQuote(value: FxQuote): FxQuote {
    const numericRate = Number(value.rate)
    if (
        typeof value.rate !== "string" ||
        !/^\d+(?:\.\d+)?$/.test(value.rate) ||
        !Number.isFinite(numericRate) ||
        numericRate <= 0 ||
        typeof value.provider !== "string" ||
        value.provider.trim() !== value.provider ||
        value.provider.length === 0 ||
        value.provider.length > 100
    ) {
        throw new FxUnavailableError()
    }
    return {
        rate: value.rate,
        provider: value.provider,
        effectiveAt: parseEffectiveAt(value.effectiveAt)
    }
}

export async function getFxQuote(
    base: string,
    target: string,
    environment: Environment = process.env
): Promise<FxQuote> {
    if (base === target) {
        return {
            rate: "1",
            provider: "identity",
            effectiveAt: null
        }
    }

    try {
        const providerUrl = (
            environment.RATE_PROVIDER_URL ||
            "https://api.frankfurter.dev"
        ).replace(/\/+$/, "")
        const response = await fetch(
            `${providerUrl}/v2/rate/${base}/${target}`
        )
        if (!response.ok) throw new FxUnavailableError()

        const body = await response.json() as {
            rate?: unknown
            date?: unknown
        }
        const numericRate = typeof body.rate === "number"
            ? body.rate
            : Number(body.rate)
        if (!Number.isFinite(numericRate) || numericRate <= 0) {
            throw new FxUnavailableError()
        }

        return validateFxQuote({
            rate: String(body.rate),
            provider: "frankfurter",
            effectiveAt: body.date === undefined
                ? null
                : String(body.date)
        })
    } catch (error) {
        if (error instanceof FxUnavailableError) throw error
        logger.warn("fx_provider_request_failed", {
            operation: "get_fx_quote",
            sourceCurrency: base,
            targetCurrency: target
        }, error)
        throw new FxUnavailableError()
    }
}
