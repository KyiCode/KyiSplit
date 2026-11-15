import { useId, useState } from "react"

type PasswordInputProp = {
    value: string
    onChange: (value: string) => void
    describedBy?: string
    autoComplete?: "current-password" | "new-password"
    placeholder?: string
}

function PasswordInput({
    value,
    onChange,
    describedBy,
    autoComplete = "current-password",
    placeholder = "Enter your password"
}: PasswordInputProp) {
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
                    autoComplete={autoComplete}
                    placeholder={placeholder}
                    aria-describedby={describedBy}
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
