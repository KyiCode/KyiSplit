import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { joinGroup } from "../api/groups";

function JoinPage() {
    const { inviteToken } = useParams()
    const navigate = useNavigate()
    const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null) // null = still checking
    const [errorMessage, setErrorMessage] = useState()
    useEffect(() => {
        // just attempt to join, cookie is sent automatically
        if (!inviteToken) {
            console.log("invalid token")
            return
        }
        logInIfCookie()
    }, [])

    async function logInIfCookie() {
        const data = await joinGroup(inviteToken!)
        if (data.status == "success") {
            navigate(`/group/${data.groupId}`)
            setIsLoggedIn(false)
        } else {
            setErrorMessage(data.message)
        }

    }

    // if (isLoggedIn === null) return <p>Loading...</p>

    const handleLogin = () => {
        localStorage.setItem("pendingInvite", inviteToken!)
        navigate("/login")
    }

    const handleSignUp = () => {
        localStorage.setItem("pendingInvite", inviteToken!)
        navigate("/signup")
    }

    return (
        <>
            <div>
                <h1>Have an account?</h1>
                <button onClick={handleLogin}>Log In</button>
            </div>
            <div>
                <h1>No account?</h1>
                <button onClick={handleSignUp}>Sign Up</button>
            </div>

            {errorMessage !== null && <div>{errorMessage}</div>}
        </>
    )
}

export default JoinPage