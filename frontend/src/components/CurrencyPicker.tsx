import { useEffect, useState } from "react"
import { fetchCurrencies } from "../api/currency"

import { type CurrencyType } from "../interfaces/interface"

function CurrencyPicker({ onSelect }: { onSelect: (currency: CurrencyType) => void }) {
    const [currencyList, setCurrencyList] = useState<CurrencyType[]>([])
    const [currencyDisplay, setCurrencyDisplay] = useState<CurrencyType[]>([])
    const [currency, setCurrency] = useState("")
    const [searchCurrency, setSearchCurrency] = useState("")

    useEffect(() => {
        async function getCurrencies() {
            try {
                const data = await fetchCurrencies()
                console.log(data)
                setCurrencyList(data)
                setCurrencyDisplay(data)
            } catch (error) {
                console.log(error)
            }
        }
        getCurrencies()
    }, [])

    function handleSearch(searchTarget: string) {
        setSearchCurrency(searchTarget.toLowerCase())
        const filteredCurrencies = currencyList.filter(currency =>
            currency.currencyIso.toLowerCase().includes(searchCurrency) ||
            currency.currencyName.toLowerCase().includes(searchCurrency)
        )
        setCurrencyDisplay(filteredCurrencies)
    }


    return (
        <>
            <h1>

                <input type="text" placeholder="search currency" onChange={(e) => handleSearch(e.target.value)}></input>

            </h1>
            {currencyDisplay.map(currency => <CurrencyBox currency={currency} onSelect={onSelect}></CurrencyBox>)}
        </>
    )
}

function CurrencyBox({ currency, onSelect }: { currency: CurrencyType, onSelect: (currency: CurrencyType) => void }) {

    return (
        <button onClick={() => onSelect(currency)}>{currency.currencyIso} {currency.currencyName}</button>
    )
}


export default CurrencyPicker