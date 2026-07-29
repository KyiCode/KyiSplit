import { useEffect, useState, type ReactNode } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { verifySession } from "../api/auth"

function ProtectedRoute({ children }: { children: ReactNode }) {
    const [status, setStatus] = useState<"checking" | "authenticated" | "anonymous">("checking")
    const location = useLocation()

    useEffect(() => {
        let active = true
        verifySession()
            .then(data => {
                if (active) setStatus(data.status === "success" ? "authenticated" : "anonymous")
            })
            .catch(() => {
                if (active) setStatus("anonymous")
            })
        return () => { active = false }
    }, [])

    if (status === "checking") {
        return (
            <main className="auth-check">
                <span>Checking session…</span>
            </main>
        )
    }

    if (status === "anonymous") {
        return <Navigate to="/auth" replace state={{ from: location.pathname }} />
    }

    return children
}

export default ProtectedRoute
