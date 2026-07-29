import type { CurrencyType } from "../interfaces/interface"

type FrankfurterCurrency = {
    iso_code: string
    name: string
}

export async function fetchCurrencies(): Promise<CurrencyType[]> {
    const res = await fetch("https://api.frankfurter.dev/v2/currencies")

    if (!res.ok) throw new Error("Unable to load currencies")

    const currencies = await res.json() as FrankfurterCurrency[]
    return currencies.map((currency) => ({
        currencyIso: currency.iso_code,
        currencyName: currency.name
    }))
}
