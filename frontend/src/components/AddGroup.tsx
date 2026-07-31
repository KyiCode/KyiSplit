import { useState } from "react"
import type { CurrencyType } from "../interfaces/interface"
import CurrencyPicker from "./CurrencyPicker"
import Modal from "./Modal"

function AddGroup({ onAddGroup }: {
    onAddGroup: (
        groupName: string,
        groupUserName: string,
        defaultCurrency: string
    ) => Promise<boolean>
}) {
    const [addingGroup, setAddingGroup] = useState(false);
    const [groupName, setGroupName] = useState("");
    const [userName, setUserName] = useState("");
    const [currency, setCurrency] = useState<CurrencyType>()
    const [showCurrencyPicker, setShowCurrencyPicker] = useState(false)
    const [submitting, setSubmitting] = useState(false);

    async function handleAddGroup() {
        if (submitting || !currency) return

        setSubmitting(true)
        const created = await onAddGroup(
            groupName,
            userName,
            currency.currencyIso
        )
        setSubmitting(false)
        if (created) {
            setGroupName("")
            setUserName("")
            setCurrency(undefined)
            setAddingGroup(false)
        }
    }

    return (
        <div className="create-group-card">
            {addingGroup ? (
                <div className="create-group-form">
                    <div className="section-heading">
                        <div>
                            <span className="eyebrow">New shared tab</span>
                            <h2>Create a group</h2>
                        </div>
                        <button className="icon-button subtle" onClick={() => setAddingGroup(false)} aria-label="Cancel">×</button>
                    </div>
                    <label className="field">
                        <span>Group name</span>
                        <input
                            type="text"
                            placeholder="Weekend in Penang"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                        />
                    </label>
                    <label className="field">
                        <span>Your name in this group</span>
                        <input
                            type="text"
                            placeholder="Kai"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                        />
                    </label>
                    <div className="field">
                        <span>Group currency</span>
                        <button
                            aria-label={currency
                                ? `Group currency: ${currency.currencyIso} — ${currency.currencyName}. Change currency`
                                : "Choose group currency"}
                            className="button secondary full"
                            type="button"
                            onClick={() => setShowCurrencyPicker(true)}
                        >
                            {currency
                                ? `${currency.currencyIso} — ${currency.currencyName}`
                                : "Choose currency"}
                        </button>
                    </div>
                    <button className="button primary full" disabled={!groupName.trim() || !userName.trim() || !currency || submitting} onClick={handleAddGroup}>
                        {submitting ? "Creating…" : "Create group"}
                    </button>
                    {showCurrencyPicker && (
                        <Modal
                            ariaLabel="Choose group currency"
                            onClose={() => setShowCurrencyPicker(false)}
                        >
                            <CurrencyPicker onSelect={selection => {
                                setCurrency(selection)
                                setShowCurrencyPicker(false)
                            }} />
                        </Modal>
                    )}
                </div>
            ) : (
                <button className="create-group-prompt" onClick={() => setAddingGroup(true)}>
                    <span className="create-icon">+</span>
                    <span>
                        <strong>Start a new group</strong>
                        <small>Trip, home, dinner—anything shared.</small>
                    </span>
                </button>
            )}
        </div>
    )
}



export default AddGroup
