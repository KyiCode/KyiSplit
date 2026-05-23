import { useState } from "react"
import AddGroup from "../components/AddGroup"
import GroupList from "../components/GroupList"

interface Member {
    memberName: string
    memberEmail: string

}

interface GroupDetailsProp {
    groupName: string
    groupMembers: Member[]
}

const member1: Member = { memberName: "tom", memberEmail: "tom@email.com" }
const member2: Member = { memberName: "claire", memberEmail: "claire@email.com" }
const member3: Member = { memberName: "sheldon", memberEmail: "sheldon@email.com" }
const member4: Member = { memberName: "leonard", memberEmail: "leonard@email.com" }

const initialGroups: GroupDetailsProp[] = [
    { groupName: "group1", groupMembers: [member1, member2] },
    { groupName: "group2", groupMembers: [member3, member4] },
]

function MainPage() {
    const [groups, setGroups] = useState<GroupDetailsProp[]>(initialGroups)

    function handleAddGroup(groupName: string) {
        const newGroup: GroupDetailsProp = {
            groupName: groupName,
            groupMembers: []
        }
        setGroups([...groups, newGroup])  // add new group to groups array
        alert(`Add Group: ${groupName}`)
    }

    function onEnterGroup(groupDetails: GroupDetailsProp) {
        alert(`Entering Group: ${groupDetails.groupName} with  members: ${groupDetails.groupMembers.map(member => member.memberName).join(", ")}`)
    }

    return (
        <>
            <h1>Main Page</h1>
            <GroupList groups={groups} onEnterGroup={onEnterGroup} />
            <AddGroup onAddGroup={handleAddGroup} />
        </>

    )
}

export default MainPage