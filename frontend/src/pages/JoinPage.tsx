import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import Brand from "../components/Brand"
import { joinGroup } from "../api/groups"
import { verifySession } from "../api/auth"
import { ApiError } from "../api/client"

function JoinPage() {
    const { inviteToken } = useParams()
    const navigate = useNavigate()
    const [userName, setUserName] = useState("")
    const [errorMessage, setErrorMessage] = useState("")
    const [sessionState, setSessionState] = useState<
        "checking" | "authenticated" | "anonymous" | "unavailable"
    >("checking")
    const [sessionAttempt, setSessionAttempt] = useState(0)
    const [joining, setJoining] = useState(false)
    const [inviteState, setInviteState] = useState<
        "ready" | "expired" | "missing" | "already-member"
    >("ready")

    useEffect(() => {
        let active = true
        verifySession()
            .then(() => active && setSessionState("authenticated"))
            .catch(error => {
                if (!active) return
                setSessionState(
                    error instanceof ApiError && error.status === 401
                        ? "anonymous"
                        : "unavailable"
                )
            })
        return () => { active = false }
    }, [inviteToken, sessionAttempt])

    async function handleJoin() {
        if (joining || inviteState !== "ready") return
        if (!inviteToken) {
            setErrorMessage("This invite link is incomplete.")
            return
        }
        setJoining(true)
        setErrorMessage("")
        try {
            const data = await joinGroup(inviteToken, userName)
            localStorage.removeItem("pendingInvite")
            navigate(`/group/${data.groupId}`)
        } catch (error) {
            if (error instanceof ApiError) {
                if (error.status === 410 || error.code === "INVITE_EXPIRED") {
                    setInviteState("expired")
                    localStorage.removeItem("pendingInvite")
                    setErrorMessage(
                        "This invite has expired. Ask a group member for a new link."
                    )
                } else if (
                    error.status === 404 ||
                    error.code === "INVITE_NOT_FOUND"
                ) {
                    setInviteState("missing")
                    localStorage.removeItem("pendingInvite")
                    setErrorMessage(
                        "This invite link is not valid. Check that you copied the whole link."
                    )
                } else if (
                    error.status === 409 ||
                    error.code === "ALREADY_MEMBER"
                ) {
                    setInviteState("already-member")
                    localStorage.removeItem("pendingInvite")
                    setErrorMessage("You already belong to this group.")
                } else {
                    setErrorMessage(error.message)
                }
            } else {
                setErrorMessage("Unable to join this group right now.")
            }
        } finally {
            setJoining(false)
        }
    }

    function continueTo(path: "/auth" | "/signup") {
        localStorage.setItem("pendingInvite", inviteToken || "")
        navigate(path)
    }

    return (
        <main className="join-shell">
            <Brand />
            <section className="join-card">
                <span className="eyebrow">You’re invited</span>
                <h1>Come split the tab.</h1>
                <p className="join-intro">A friend invited you to a KyiSplit group. Join to see shared expenses and add your own.</p>

                {sessionState === "checking" && (
                    <div className="join-loading" role="status">Checking your account…</div>
                )}

                {sessionState === "authenticated" && (
                    <div className="join-form">
                        <label className="field">
                            <span>Your name in this group</span>
                            <input value={userName} onChange={event => setUserName(event.target.value)} placeholder="What should friends call you?" />
                        </label>
                        <button
                            className="button primary full large"
                            disabled={
                                !userName.trim() ||
                                joining ||
                                inviteState !== "ready"
                            }
                            onClick={handleJoin}
                        >
                            {joining ? "Joining…" : "Join group"}
                        </button>
                    </div>
                )}

                {sessionState === "anonymous" && (
                    <div className="join-actions">
                        <button className="button primary full large" onClick={() => continueTo("/auth")}>Sign in to join</button>
                        <button className="button secondary full" onClick={() => continueTo("/signup")}>Create an account</button>
                    </div>
                )}

                {sessionState === "unavailable" && (
                    <div className="join-actions">
                        <div className="notice error small" role="alert">
                            Unable to check your session.
                        </div>
                        <button
                            className="button secondary full"
                            onClick={() => {
                                setSessionState("checking")
                                setSessionAttempt(value => value + 1)
                            }}
                        >
                            Try again
                        </button>
                    </div>
                )}

                {errorMessage && <div className="notice error small" role="alert">{errorMessage}</div>}
                {inviteState === "already-member" && (
                    <button
                        className="button secondary full"
                        onClick={() => navigate("/")}
                    >
                        Open your groups
                    </button>
                )}
                <small className="privacy-note">Only group members can see shared expenses.</small>
            </section>
        </main>
    )
}

export default JoinPage
