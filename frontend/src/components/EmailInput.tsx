
type EmailInputProp = {
    value: string
    onChange: (value: string) => void
}

function EmailInput({ value, onChange }: EmailInputProp) {

    return (
        <label className="field">
            <span>Email</span>
            <input
                type={value.startsWith("dev") ? "text" : "email"}
                autoComplete="email"
                placeholder="you@example.com"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </label>
    )
}

export default EmailInput
