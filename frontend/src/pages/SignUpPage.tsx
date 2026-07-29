import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import Brand from "../components/Brand"
import EmailInput from "../components/EmailInput"
import PasswordInput from "../components/PasswordInput"
import { signUp } from "../api/auth"

function SignUpPage() {
    const navigate = useNavigate()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [errorMessage, setErrorMessage] = useState("")
    const [success, setSuccess] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    async function handleSubmit(event: FormEvent) {
        event.preventDefault()
        setSubmitting(true)
        setErrorMessage("")
        try {
            const data = await signUp(email, password)
            if (data.status === "success") {
                setSuccess(true)
                window.setTimeout(() => navigate("/auth"), 1200)
            } else {
                setErrorMessage(data.message || "Unable to create your account.")
            }
        } catch {
            setErrorMessage("Unable to create your account right now.")
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
                    <h1>Create account</h1>
                    <p>Enter your email and choose a password.</p>
                </header>
                <EmailInput value={email} onChange={setEmail} />
                <PasswordInput value={password} onChange={setPassword} />
                {errorMessage && <div className="notice error small">{errorMessage}</div>}
                {success && <div className="notice success small">Account created. Redirecting…</div>}
                <button className="button primary full" disabled={!email || password.length < 8 || submitting || success}>
                    {submitting ? "Creating account…" : "Create account"}
                </button>
                <p className="auth-switch">Already registered? <Link to="/auth">Sign in</Link></p>
            </form>
        </main>
    )
}

export default SignUpPage
