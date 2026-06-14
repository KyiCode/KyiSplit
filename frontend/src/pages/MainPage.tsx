import { useEffect, useState } from "react"
import AddGroup from "../components/AddGroup"
import GroupList from "../components/GroupList"
import { useNavigate } from "react-router-dom"
import AccountButton from "../components/AccountButton"
import { createGroup, fetchGroup, fetchGroups } from "../api/groups"

import type { Member, Group } from '../interfaces/interface'


function MainPage() {
    // const [groups, setGroups] = useState<Group[]>(currGroups)
    const [groups, setGroups] = useState<Group[]>([])
    const navigate = useNavigate()

    useEffect(() => {
        console.log("HERE")
        getGroups()
    }, [])

    async function getGroups() {
        try {
            const data = await fetchGroups()
            if (data.status == "success") setGroups(data.groupDetails)  // gid gname gmembers(uid ugrpname)
        } catch (error) {
            console.log(error)
        }
    }

    async function handleAddGroup(groupName: string) {
        try {
            const data = await createGroup(groupName)
            if (data.status == "success") getGroups()
        } catch (error) {
            console.log(error)
        }
    }

    async function onEnterGroup(groupId: string) {
        try {
            const data = await fetchGroup(groupId)
            console.log(data)
            if (data.status == "success") {
                navigate(`/group/${groupId}`)
            } else {
                console.log("error entering group")
            }
        } catch (error) {
            console.log(error)
        }
    }

    return (
        <>
            <div>
                <h2>Nav
                    <AccountButton />  // change to logout etc
                </h2>

            </div>

            <h1>Main Page</h1>

            <GroupList groups={groups} onEnterGroup={onEnterGroup} />
            <AddGroup onAddGroup={handleAddGroup} />

        </>

    )
}

export default MainPage