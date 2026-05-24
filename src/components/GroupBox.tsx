import { useState } from "react";
import type { Member, Group } from '../interfaces/interface'



function GroupBox({ groupName, groupMembers, onEnterGroup }: Group & { onEnterGroup: (groupDetails: Group) => void }) {
    function handleEnterGroup() {
        onEnterGroup({ groupName, groupMembers, expenses: [] })
    }

    return (
        <div>
            <div>{groupName}</div>
            <div>
                {groupMembers.map(
                    member => {
                        return <div>{member.memberName}</div>
                    })}
            </div>
            <button onClick={() => handleEnterGroup()}>Enter</button>

        </div>
    )
}


export default GroupBox