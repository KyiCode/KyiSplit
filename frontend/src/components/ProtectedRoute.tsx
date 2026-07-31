import { useEffect, useState, type ReactNode } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { verifySession } from "../api/auth"
import { ApiError } from "../api/client"

function ProtectedRoute({ children }: { children: ReactNode }) {
    const [status, setStatus] = useState<
        "checking" | "authenticated" | "anonymous" | "unavailable"
    >("checking")
    const [attempt, setAttempt] = useState(0)
    const location = useLocation()

    useEffect(() => {
        let active = true
        verifySession()
            .then(() => {
                if (active) setStatus("authenticated")
            })
            .catch(error => {
                if (!active) return
                setStatus(
                    error instanceof ApiError && error.status === 401
                        ? "anonymous"
                        : "unavailable"
                )
            })
        return () => { active = false }
    }, [attempt])

    if (status === "checking") {
        return (
            <main className="auth-check">
                <span role="status">Checking session…</span>
            </main>
        )
    }

    if (status === "anonymous") {
        return (
            <Navigate
                to="/auth"
                replace
                state={{ from: `${location.pathname}${location.search}` }}
            />
        )
    }

    if (status === "unavailable") {
        return (
            <main className="auth-check">
                <span role="alert">Unable to check your session.</span>
                <button
                    className="button secondary compact"
                    onClick={() => {
                        setStatus("checking")
                        setAttempt(value => value + 1)
                    }}
                >
                    Try again
                </button>
            </main>
        )
    }

    return children
}

export default ProtectedRoute
