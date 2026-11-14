type UsernameInputProp = {
    value: string
    onChange: (value: string) => void
}

function UsernameInput({ value, onChange }: UsernameInputProp) {
    return (
        <label className="field">
            <span>Username</span>
            <input
                type="text"
                autoComplete="username"
                placeholder="Your username"
                minLength={3}
                maxLength={32}
                pattern="[A-Za-z0-9_-]{3,32}"
                title="Use 3–32 letters, numbers, underscores, or hyphens."
                required
                autoCapitalize="none"
                autoCorrect="off"
                value={value}
                onChange={(event) => onChange(event.target.value)}
            />
        </label>
    )
}

export default UsernameInput
