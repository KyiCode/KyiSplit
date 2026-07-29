import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import AddGroup from "../components/AddGroup"
import GroupList from "../components/GroupList"
import PageShell from "../components/PageShell"
import { createGroup, fetchGroup, fetchGroups } from "../api/groups"
import type { Group } from "../interfaces/interface"

function MainPage() {
    const [groups, setGroups] = useState<Group[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const navigate = useNavigate()

    useEffect(() => {
        let active = true
        fetchGroups()
            .then(data => {
                if (!active) return
                if (data.status === "success") setGroups(data.groupDetails)
                else setError(data.message || "Unable to load your groups.")
            })
            .catch(() => active && setError("We couldn't load your groups. Is the server running?"))
            .finally(() => active && setLoading(false))
        return () => { active = false }
    }, [])

    async function refreshGroups() {
        const data = await fetchGroups()
        if (data.status === "success") setGroups(data.groupDetails)
    }

    async function handleAddGroup(groupName: string, groupUserName: string) {
        setError("")
        try {
            const data = await createGroup(groupName, groupUserName)
            if (data.status === "success") await refreshGroups()
            else setError(data.message || "Unable to create that group.")
        } catch {
            setError("Unable to create that group right now.")
        }
    }

    async function onEnterGroup(groupId: string) {
        try {
            const data = await fetchGroup(groupId)
            if (data.status === "success") navigate(`/group/${groupId}`)
            else setError("You no longer have access to that group.")
        } catch {
            setError("Unable to open that group.")
        }
    }

    return (
        <PageShell>
            <section className="page-header">
                <h1>Groups</h1>
                <p>Your shared expenses.</p>
            </section>

            {error && <div className="notice error">{error}</div>}

            <section className="dashboard-grid compact-dashboard">
                <div className="groups-panel">
                    <div className="section-heading">
                        <h2>Your groups</h2>
                        <span className="count-badge">{groups.length}</span>
                    </div>

                    {loading ? (
                        <div className="skeleton-list" aria-label="Loading groups">
                            <span />
                            <span />
                            <span />
                        </div>
                    ) : groups.length > 0 ? (
                        <GroupList groups={groups} onEnterGroup={onEnterGroup} />
                    ) : (
                        <div className="empty-state">
                            <span className="empty-mark">0</span>
                            <h3>No shared tabs yet</h3>
                            <p>Create one for your next trip, meal or household bill.</p>
                        </div>
                    )}
                </div>
                <aside>
                    <AddGroup onAddGroup={handleAddGroup} />
                </aside>
            </section>
        </PageShell>
    )
}

export default MainPage
