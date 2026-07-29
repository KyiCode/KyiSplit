import { useEffect, useState } from "react"
import { fetchCurrencies } from "../api/currency"
import { type CurrencyType } from "../interfaces/interface"

function CurrencyPicker({ onSelect }: { onSelect: (currency: CurrencyType) => void }) {
    const [currencyList, setCurrencyList] = useState<CurrencyType[]>([])
    const [currencyDisplay, setCurrencyDisplay] = useState<CurrencyType[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchCurrencies()
            .then(data => {
                setCurrencyList(data)
                setCurrencyDisplay(data)
            })
            .catch(error => console.log(error))
            .finally(() => setLoading(false))
    }, [])

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
            <input className="search-input" type="search" placeholder="Search USD, Singapore dollar…" onChange={(e) => handleSearch(e.target.value)} autoFocus />
            {loading ? <p className="muted-copy">Loading currencies…</p> : (
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
