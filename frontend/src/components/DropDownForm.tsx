import { useEffect, useState } from "react"
import { type GroupMemberType } from "../interfaces/interface"
import { fetchGroupMembers } from "../api/groups"

function DropDownForm({ groupId }: { groupId: string }) {
    const [groupMembers, setGroupMembers] = useState<GroupMemberType[]>([])

    useEffect(() => {
        let active = true
        fetchGroupMembers(groupId).then(data => {
            if (active && Array.isArray(data)) setGroupMembers(data)
        })
        return () => { active = false }
    }, [groupId])

    return (
        <div className="member-amount-list">
            {groupMembers.map(member => (
                <label className="member-amount-row" key={member.userId}>
                    <span>{member.userGroupName}</span>
                    <input type="number" min="0" placeholder="0.00" />
                </label>
            ))}
        </div>
    )
}

export default DropDownForm
