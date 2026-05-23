import { useNavigate } from "react-router-dom"

function GroupPage() {
    const navigate = useNavigate()

    function handleExitGroup() {
        alert("Exiting group")
        navigate("/")
    }

    return (
        <div>
            <h1>Group Page</h1>
            <button onClick={() => handleExitGroup()}> Exit group</button>
        </div>
    )
}

export default GroupPage