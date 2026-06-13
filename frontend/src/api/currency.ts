import type { CurrencyType } from "../interfaces/interface"

export async function fetchCurrencies() {
    const res = await fetch("https://api.frankfurter.dev/v2/currencies")

    if (!res) {
        console.log("Error fetching currency from api")
        return
    }
    const currencies = await res.json()
    const result = currencies.map((currency: any) => ({
        currencyIso: currency.iso_code,
        currencyName: currency.name
    }))

    return result
} 