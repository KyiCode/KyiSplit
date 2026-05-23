import SignUp from "../components/SignUpForm"
import { useNavigate } from "react-router-dom"

function SignUpPage() {
    const navigate = useNavigate()

    return (
        <div>
            <h1>Sign Up Page</h1>
            <SignUp />

            <div>
                <p>Already have an account?</p>
                <button onClick={() => navigate("/login")}> Log in</button>
            </div>
        </div>
    )
}

export default SignUpPage