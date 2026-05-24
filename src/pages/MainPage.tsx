import { useState } from "react"
import AddGroup from "../components/AddGroup"
import GroupList from "../components/GroupList"
import { useNavigate } from "react-router-dom"
import AccountButton from "../components/AccountButton"

import type { Member, Group } from '../interfaces/interface'

const member1: Member = { memberName: "tom", memberEmail: "tom@email.com" }
const member2: Member = { memberName: "claire", memberEmail: "claire@email.com" }
const member3: Member = { memberName: "sheldon", memberEmail: "sheldon@email.com" }
const member4: Member = { memberName: "leonard", memberEmail: "leonard@email.com" }

const initialGroups: Group[] = [
    { groupName: "group1", groupMembers: [member1, member2], expenses: [] },
    { groupName: "group2", groupMembers: [member3, member4], expenses: [] },
]

function MainPage() {
    const [groups, setGroups] = useState<Group[]>(initialGroups)
    const navigate = useNavigate()
    function handleAddGroup(groupName: string) {
        const newGroup: Group = {
            groupName: groupName,
            groupMembers: [],
            expenses: []  // placeholder, will implement expenses later
        }
        setGroups([...groups, newGroup])  // add new group to groups array
        alert(`Add Group: ${groupName}`)
    }

    function onEnterGroup(groupDetails: Group) {
        alert(`Entering Group: ${groupDetails.groupName} with  members: ${groupDetails.groupMembers.map(member => member.memberName).join(", ")}`)
        navigate("/group")
    }

    return (
        <>
            <div>
                <h2>Nav
                    <AccountButton />
                </h2>

            </div>

            <h1>Main Page</h1>

            <GroupList groups={groups} onEnterGroup={onEnterGroup} />
            <AddGroup onAddGroup={handleAddGroup} />

        </>

    )
}

export default MainPage