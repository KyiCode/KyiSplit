import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import Brand from "../components/Brand"
import { joinGroup } from "../api/groups"
import { verifySession } from "../api/auth"

function JoinPage() {
    const { inviteToken } = useParams()
    const navigate = useNavigate()
    const [userName, setUserName] = useState("")
    const [errorMessage, setErrorMessage] = useState("")
    const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
    const [joining, setJoining] = useState(false)

    useEffect(() => {
        let active = true
        verifySession()
            .then(data => active && setIsLoggedIn(data.status === "success"))
            .catch(() => active && setIsLoggedIn(false))
        return () => { active = false }
    }, [inviteToken])

    async function handleJoin() {
        if (!inviteToken) {
            setErrorMessage("This invite link is incomplete.")
            return
        }
        setJoining(true)
        try {
            const data = await joinGroup(inviteToken, userName)
            if (data.status === "success") navigate(`/group/${data.groupId}`)
            else setErrorMessage(data.message || "This invite could not be accepted.")
        } catch {
            setErrorMessage("Unable to join this group right now.")
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

                {isLoggedIn === null && <div className="join-loading">Checking your account…</div>}

                {isLoggedIn && (
                    <div className="join-form">
                        <label className="field">
                            <span>Your name in this group</span>
                            <input value={userName} onChange={event => setUserName(event.target.value)} placeholder="What should friends call you?" />
                        </label>
                        <button className="button primary full large" disabled={!userName.trim() || joining} onClick={handleJoin}>
                            {joining ? "Joining…" : "Join group"}
                        </button>
                    </div>
                )}

                {isLoggedIn === false && (
                    <div className="join-actions">
                        <button className="button primary full large" onClick={() => continueTo("/auth")}>Sign in to join</button>
                        <button className="button secondary full" onClick={() => continueTo("/signup")}>Create an account</button>
                    </div>
                )}

                {errorMessage && <div className="notice error small">{errorMessage}</div>}
                <small className="privacy-note">Only group members can see shared expenses.</small>
            </section>
        </main>
    )
}

export default JoinPage
