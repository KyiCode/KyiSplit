import { useState } from "react";
import type { Member, Group } from '../interfaces/interface'



function GroupBox({ group, onEnterGroup }: { group: Group, onEnterGroup: (groupId: string) => void }) {
    function handleEnterGroup() {
        onEnterGroup(group.groupId)
    }

    return (
        <div>
            <div>{group.groupName}</div>
            <div>
                {group.groupMembers.map(
                    member => {
                        return <div>{member.memberName}</div>
                    })}
            </div>
            <button onClick={() => handleEnterGroup()}>Enter</button>

        </div>
    )
}


export default GroupBox