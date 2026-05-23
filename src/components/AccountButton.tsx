import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function AccountButton() {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isLoggedIn, setIsLoggedIn] = useState(false) // Placeholder for login state
    const navigate = useNavigate()

    function handleLogin() {
        alert("Logging in")
        setIsLoggedIn(true)
        navigate("/login")
    }

    function handleLogout() {
        alert("Logging out")
        setIsLoggedIn(false)
    }

    function handleSignUp() {
        alert("Signing up")
        navigate("/signup")
    }

    return (
        <div className="account-dropdown">
            <button className="account-button" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                Account
            </button>
            {isMenuOpen && isLoggedIn && (
                <button onClick={handleLogout}>Logout</button>
            )}
            {isMenuOpen && !isLoggedIn && (
                <>
                    <button onClick={handleLogin}>Login</button>
                    <button onClick={handleSignUp}>Sign Up</button>
                </>
            )}
        </div>
    )
}


export default AccountButton