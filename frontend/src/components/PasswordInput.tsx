import { useState } from "react"

type PasswordInputProp = {
    value: string
    onChange: (value: string) => void
}

function PasswordInput({ value, onChange }: PasswordInputProp) {
    const [hidePassword, setHidePassword] = useState(true)

    return (
        <label className="field">
            <span>Password</span>
            <span className="password-wrap">
                <input
                    value={value}
                    type={hidePassword ? "password" : "text"}
                    autoComplete="current-password"
                    placeholder="At least 8 characters"
                    onChange={(e) => onChange(e.target.value)}
                />
                <button className="text-button" type="button" onClick={() => setHidePassword(!hidePassword)}>
                    {hidePassword ? "Show" : "Hide"}
                </button>
            </span>
        </label>
    )
}

export default PasswordInput
