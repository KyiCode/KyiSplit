import type { ThemePreference } from "../theme/themeContext"
import { useTheme } from "../theme/useTheme"

function ThemeControl() {
    const { preference, setPreference } = useTheme()
    return (
        <label className="theme-control">
            <span className="theme-control-label">Theme</span>
            <select
                aria-label="Color theme"
                value={preference}
                onChange={event => setPreference(event.target.value as ThemePreference)}
            >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
            </select>
        </label>
    )
}

export default ThemeControl
