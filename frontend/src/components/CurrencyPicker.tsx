import { useEffect, useState } from "react"
import { fetchCurrencies } from "../api/currency"
import { type CurrencyType } from "../interfaces/interface"

function CurrencyPicker({ onSelect }: { onSelect: (currency: CurrencyType) => void }) {
    const [currencyList, setCurrencyList] = useState<CurrencyType[]>([])
    const [currencyDisplay, setCurrencyDisplay] = useState<CurrencyType[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [attempt, setAttempt] = useState(0)

    useEffect(() => {
        fetchCurrencies()
            .then(data => {
                setError("")
                setCurrencyList(data)
                setCurrencyDisplay(data)
            })
            .catch(() => {
                setError("Unable to load currencies.")
            })
            .finally(() => setLoading(false))
    }, [attempt])

    function handleSearch(searchTarget: string) {
        const query = searchTarget.toLowerCase()
        setCurrencyDisplay(currencyList.filter(currency =>
            currency.currencyIso.toLowerCase().includes(query) ||
            currency.currencyName.toLowerCase().includes(query)
        ))
    }

    return (
        <div className="currency-picker">
            <span className="eyebrow">Choose currency</span>
            <h2>What was this paid in?</h2>
            <input aria-label="Search currencies" className="search-input" type="search" placeholder="Search USD, Singapore dollar…" onChange={(e) => handleSearch(e.target.value)} autoFocus />
            {loading ? <p className="muted-copy" role="status">Loading currencies…</p> : error ? (
                <div className="notice error small" role="alert">
                    <span>{error}</span>
                    <button onClick={() => {
                        setLoading(true)
                        setError("")
                        setAttempt(value => value + 1)
                    }}>
                        Try again
                    </button>
                </div>
            ) : (
                <div className="currency-list">
                    {currencyDisplay.map(currency => (
                        <button className="currency-option" key={currency.currencyIso} onClick={() => onSelect(currency)}>
                            <strong>{currency.currencyIso}</strong>
                            <span>{currency.currencyName}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

export default CurrencyPicker
