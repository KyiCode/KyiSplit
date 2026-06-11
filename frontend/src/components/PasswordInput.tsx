import { useState } from "react"

type PasswordInputProp = {
    value: string
    onChange: (value: string) => void
}

function PasswordInput({ value, onChange }: PasswordInputProp) {
    const [hidePassword, setHidePassword] = useState(true)

    return (
        <div>
            <label> Password </label>
            <input
                value={value}
                type={hidePassword ? "password" : "text"}
                onChange={(e) => onChange(e.target.value)}
            />
            <button type="button" onClick={() => setHidePassword(!hidePassword)}>
                {hidePassword ? "show" : "hide"}
            </button>
        </div>
    )
}

export default PasswordInput