import { useNavigate } from "react-router-dom"
import PasswordInput from "../components/PasswordInput"
import { useState } from "react";
import EmailInput from "../components/EmailInput"

import { signUp } from "../api/auth"


function SignUpPage() {
    const navigate = useNavigate()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [signUpSuccess, setSignUpSuccess] = useState(false)
    const [signUpFail, setSignUpFail] = useState(false)
    const [errorMessage, setErrorMessage] = useState()

    const handleSubmit = async () => {
        const data = await signUp(email, password)
        console.log(`Sign up: ${data}`)
        setEmail("")
        setPassword("")
        if (data.status == "success") {
            setSignUpFail(false)
            setSignUpSuccess(true)
            setTimeout(() => navigate("/login"), 1500)
        } else {
            setSignUpFail(true)
            setErrorMessage(data.message)
        }
    }

    return (
        <div>
            <h1>Sign Up Page</h1>
            <div>
                <EmailInput value={email} onChange={setEmail} />
                <PasswordInput value={password} onChange={setPassword} ></PasswordInput>
                <button onClick={() => handleSubmit()}>Submit</button>
            </div>
            {signUpSuccess && <p> Account created successfully! </p>}
            {signUpFail && <p> Account creation failed! {errorMessage} </p>}
            <div>
                <p>Already have an account?</p>
                <button onClick={() => navigate("/login")}> Log in</button>
            </div>
        </div>
    )
}

export default SignUpPage