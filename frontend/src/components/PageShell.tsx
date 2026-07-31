import { useEffect, useState, type ReactNode } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { logOut } from "../api/auth"
import { apiErrorMessage } from "../api/client"
import Brand from "./Brand"

function PageShell({ children, action }: { children: ReactNode, action?: ReactNode }) {
    const location = useLocation()
    const navigate = useNavigate()
    const [loggingOut, setLoggingOut] = useState(false)
    const [logoutError, setLogoutError] = useState("")

    useEffect(() => {
        function handleUnauthorized() {
            navigate("/auth", {
                replace: true,
                state: { from: `${location.pathname}${location.search}` }
            })
        }

        window.addEventListener("kyisplit:unauthorized", handleUnauthorized)
        return () => {
            window.removeEventListener(
                "kyisplit:unauthorized",
                handleUnauthorized
            )
        }
    }, [location.pathname, location.search, navigate])

    async function handleLogout() {
        if (loggingOut) return
        setLoggingOut(true)
        setLogoutError("")
        try {
            await logOut()
            localStorage.removeItem("pendingInvite")
            navigate("/auth", { replace: true })
        } catch (error) {
            setLogoutError(apiErrorMessage(
                error,
                "Unable to sign out right now."
            ))
            setLoggingOut(false)
        }
    }

    return (
        <div className="app-shell">
            <header className="topbar">
                <Brand />
                <div className="topbar-actions">
                    {action}
                    <button
                        className="button ghost compact"
                        disabled={loggingOut}
                        onClick={handleLogout}
                    >
                        {loggingOut ? "Signing out…" : "Sign out"}
                    </button>
                </div>
            </header>
            <main className="page-content">
                {logoutError && (
                    <div className="notice error" role="alert">{logoutError}</div>
                )}
                {children}
            </main>
        </div>
    )
}

export default PageShell
