import { useState } from "react";

interface Member {
    memberName: string
    memberEmail: string

}

interface GroupDetailsProp {
    groupName: string
    groupMembers: Member[]
    
}



function GroupBox({groupName, groupMembers, onEnterGroup}: GroupDetailsProp & { onEnterGroup: (groupDetails: GroupDetailsProp) => void }) {
    function handleEnterGroup() {
        onEnterGroup({ groupName, groupMembers })
    }

    return (
        <div>
            <div>{groupName}</div>
            <div>
                {groupMembers.map(
                    member => {return <div>{member.memberName}</div>
                })}
            </div>
            <button onClick={()=>handleEnterGroup()}>Enter</button>

        </div>
    )
}


export default GroupBox