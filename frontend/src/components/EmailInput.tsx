
type EmailInputProp = {
    value: string
    onChange: (value: string) => void
}

function EmailInput({ value, onChange }: EmailInputProp) {

    return (
        <div>
            <label> Email </label>
            <input value={value} onChange={(e) => onChange(e.target.value)}></input>
        </div>
    )
}

export default EmailInput