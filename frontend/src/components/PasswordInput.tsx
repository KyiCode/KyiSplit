import { useId, useState } from "react"

type PasswordInputProp = {
    value: string
    onChange: (value: string) => void
}

function PasswordInput({ value, onChange }: PasswordInputProp) {
    const [hidePassword, setHidePassword] = useState(true)
    const inputId = useId()

    return (
        <div className="field">
            <label htmlFor={inputId}>Password</label>
            <span className="password-wrap">
                <input
                    id={inputId}
                    value={value}
                    type={hidePassword ? "password" : "text"}
                    autoComplete="current-password"
                    placeholder="At least 8 characters"
                    onChange={(e) => onChange(e.target.value)}
                />
                <button
                    aria-label={hidePassword ? "Show password" : "Hide password"}
                    className="text-button"
                    type="button"
                    onClick={() => setHidePassword(!hidePassword)}
                >
                    {hidePassword ? "Show" : "Hide"}
                </button>
            </span>
        </div>
    )
}

export default PasswordInput
