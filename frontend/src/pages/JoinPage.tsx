import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { joinGroup } from "../api/groups";
import { verifySession } from "../api/auth";

function JoinPage() {
    const { inviteToken } = useParams();
    const navigate = useNavigate();

    const [userName, setUserName] = useState("");
    const [errorMessage, setErrorMessage] = useState("");


    const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

    useEffect(() => {
        checkLogin();
    }, [inviteToken]);

    async function checkLogin() {
        const data = await verifySession(); // backend checks JWT cookie

        if (data.status === "success") {
            setIsLoggedIn(true);
        } else {
            setIsLoggedIn(false);
        }
    }

    async function handleJoin() {
        if (!inviteToken) {
            setErrorMessage("Invalid invite link");
            return;
        }

        const data = await joinGroup(inviteToken, userName);

        if (data.status === "success") {
            navigate(`/group/${data.groupId}`);
        } else {
            setErrorMessage(data.message);
            setTimeout(() => navigate('/'), 2000)
        }
    }

    const handleLogin = () => {
        localStorage.setItem("pendingInvite", inviteToken!);
        navigate("/login");
    };

    const handleSignUp = () => {
        localStorage.setItem("pendingInvite", inviteToken!);
        navigate("/signup");
    };

    if (isLoggedIn === null) {
        return <p>Loading...</p>;
    }

    return (
        <div>

            {isLoggedIn &&
                <>
                    <h1>Join Group</h1>

                    <p>Choose your name in this group</p>

                    <input
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="e.g. John"
                    />

                    <button
                        disabled={userName.trim() === ""}
                        onClick={handleJoin}
                    >
                        Join Group
                    </button>
                </>
            }
            {errorMessage && <p>{errorMessage}</p>}

            <hr />

            {!isLoggedIn &&
                <>
                    <div>
                        <h2>Have an account?</h2>
                        <button onClick={handleLogin}>Log In</button>
                    </div>

                    <div>
                        <h2>No account?</h2>
                        <button onClick={handleSignUp}>Sign Up</button>
                    </div>

                </>}
        </div>
    );
}

export default JoinPage;