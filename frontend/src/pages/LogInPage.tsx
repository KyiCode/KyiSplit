import { useState, type FormEvent } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import Brand from "../components/Brand"
import EmailInput from "../components/EmailInput"
import PasswordInput from "../components/PasswordInput"
import { logIn } from "../api/auth"

function LogInPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [errorMessage, setErrorMessage] = useState("")
    const [submitting, setSubmitting] = useState(false)

    async function handleSubmit(event: FormEvent) {
        event.preventDefault()
        setSubmitting(true)
        setErrorMessage("")
        try {
            const data = await logIn(email, password)
            if (data.status === "success") {
                const pendingInvite = localStorage.getItem("pendingInvite")
                if (pendingInvite) {
                    localStorage.removeItem("pendingInvite")
                    navigate(`/join/${pendingInvite}`)
                } else {
                    const requestedPath = (location.state as { from?: string } | null)?.from
                    navigate(requestedPath || "/")
                }
            } else {
                setErrorMessage(data.message || "Incorrect email or password.")
            }
        } catch {
            setErrorMessage("Unable to sign in right now.")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <main className="minimal-auth-shell">
            <div className="minimal-auth-top">
                <Brand />
            </div>
            <form className="minimal-auth-card" onSubmit={handleSubmit}>
                <header>
                    <h1>Sign in</h1>
                    <p>Enter your details to continue.</p>
                </header>
                <EmailInput value={email} onChange={setEmail} />
                <PasswordInput value={password} onChange={setPassword} />
                {errorMessage && <div className="notice error small">{errorMessage}</div>}
                <button className="button primary full" disabled={!email || !password || submitting}>
                    {submitting ? "Signing in…" : "Sign in"}
                </button>
                <p className="auth-switch">No account? <Link to="/signup">Create one</Link></p>
            </form>
        </main>
    )
}

export default LogInPage
