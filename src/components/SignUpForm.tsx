import { useState } from "react";

function SignUpForm() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [hidePassword, setHidePassword] = useState(true)

    function handleSubmit(email: string, password: string) {
        alert(`Submitted Email: ${email} Passowrd: ${password}`)
    }

    return (
        <div>
            <div>
                <label> Email </label>
                <input onChange={(e)=>setEmail(e.target.value)}></input>
            </div>     

            <div>
                <label> Password </label>
                <input 
                    value = {password}
                    type={hidePassword? "password" : "text"}
                    onChange={(e)=>setPassword(e.target.value)} 
                />
                <button type="button" onClick={() => setHidePassword(!hidePassword)}>
                    {hidePassword ? "show" : "hide"}
                </button>
            </div>     
            <button onClick={()=>handleSubmit(email, password)}>Submit</button>
        </div>
    )

}

export default SignUpForm