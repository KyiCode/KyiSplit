import { getCurrency } from "./queries"

export async function getExchangeRate(base: string, target: string) {
    if (base === target) {
        return 1
    } else {
        const xchangeRes = await fetch(`https://api.frankfurter.dev/v2/rate/${base}/${target}`)
        const xchange = await xchangeRes.json()
        return xchange.rate
    }
}


export async function convertCurrency(payments: { expense_id: string, user_id: string, amount: number }[], targetCurrency: string) {
    return await Promise.all(payments.map(async payment => {
        const currency = await getCurrency(payment.expense_id)
        const currencyMapper = new Map<String, number>()

        if (!currencyMapper.has(currency)) currencyMapper.set(currency, await getExchangeRate(currency, targetCurrency))

        const exchangeRate = currencyMapper.get(currency)
        if (!exchangeRate) throw new Error("exchange rate error")
        return {
            user_id: payment.user_id,
            amount: Number(payment.amount) * exchangeRate
        }
    }))
}