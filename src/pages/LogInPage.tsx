import SignUp from "../components/SignUpForm"
import { useNavigate } from "react-router-dom"

function LogInPage() {
    const navigate = useNavigate()

    return (
        <div>
            <h1>Log In Page</h1>
            <SignUp />
            <p> Do not have an account?</p>
            <button onClick={() => navigate("/signup")}> Sign Up</button>
        </div>

    )
}

export default LogInPage