import SignUp from "../components/SignUpForm"
import { useNavigate } from "react-router-dom"
import { useState } from "react"
import PasswordInput from "../components/PasswordInput"
import EmailInput from "../components/EmailInput"

function LogInPage() {
    const navigate = useNavigate()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")

    function handleSubmit(email: string, password: string) {
        alert(`Submitted Email: ${email} Passowrd: ${password}`)
    }

    return (
        <div>
            <h1>Log In Page</h1>

            <div>
                <EmailInput value={email} onChange={setEmail} />
                <PasswordInput value={password} onChange={setPassword} />

                <button onClick={() => handleSubmit(email, password)}>Submit</button>
            </div>

            <p> Do not have an account?</p>
            <button onClick={() => navigate("/signup")}> Sign Up</button>
        </div>

    )
}

export default LogInPage