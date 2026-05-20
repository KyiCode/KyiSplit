import { useState } from "react";

interface Member {
    memberName: string
    memberEmail: string

}

interface GroupDetailsProp {
    groupName: string
    groupMembers: Member[]
    
}



function Group(group: GroupDetailsProp) {
    function handleEnterGroup() {
        alert(`entering Group ${group.groupName}`)
    }

    return (
        <div>
            <div>{group.groupName}</div>
            <div>
                {group.groupMembers.map(
                    member => {return <div>{member.memberName}</div>
                })}
            </div>
            <button onClick={()=>handleEnterGroup()}>Enter</button>

        </div>
    )
}


export default Group 