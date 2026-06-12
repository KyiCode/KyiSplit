import { useNavigate } from "react-router-dom"
import { useState } from "react"
import PasswordInput from "../components/PasswordInput"
import EmailInput from "../components/EmailInput"

import { logIn } from "../api/auth"

function LogInPage() {
    const navigate = useNavigate()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [logInFail, setLogInFail] = useState(false)
    const [errorMessage, setErrorMessage] = useState()

    async function handleSubmit() {
        const data = await logIn(email, password)
        console.log(`log in: ${data}`)
        if (data.status === "success") {
            navigate("/")
        } else {
            setLogInFail(true)
            setErrorMessage(data.message)
        }
    }

    return (
        <div>
            <h1>Log In Page</h1>

            <div>
                <EmailInput value={email} onChange={setEmail} />
                <PasswordInput value={password} onChange={setPassword} />

                <button onClick={() => handleSubmit()}>Submit</button>
            </div>
            {logInFail && <p> Log in failed! {errorMessage} </p>}

            <p> Do not have an account?</p>
            <button onClick={() => navigate("/signup")}> Sign Up</button>
        </div>

    )
}

export default LogInPage