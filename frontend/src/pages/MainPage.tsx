import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import AddGroup from "../components/AddGroup"
import GroupList from "../components/GroupList"
import PageShell from "../components/PageShell"
import { createGroup, fetchGroup, fetchGroups } from "../api/groups"
import { ApiError, apiErrorMessage } from "../api/client"
import type { Group } from "../interfaces/interface"

function MainPage() {
    const [groups, setGroups] = useState<Group[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [loadAttempt, setLoadAttempt] = useState(0)
    const navigate = useNavigate()

    useEffect(() => {
        let active = true
        fetchGroups()
            .then(data => {
                if (!active) return
                setError("")
                setGroups(data.groups)
            })
            .catch(error => {
                if (active) {
                    setError(apiErrorMessage(
                        error,
                        "We couldn't load your groups."
                    ))
                }
            })
            .finally(() => active && setLoading(false))
        return () => { active = false }
    }, [loadAttempt])

    async function refreshGroups() {
        const data = await fetchGroups()
        setGroups(data.groups)
    }

    async function handleAddGroup(
        groupName: string,
        groupUserName: string,
        defaultCurrency: string
    ) {
        setError("")
        try {
            await createGroup(groupName, groupUserName, defaultCurrency)
            await refreshGroups()
            return true
        } catch (error) {
            setError(apiErrorMessage(
                error,
                "Unable to create that group right now."
            ))
            return false
        }
    }

    async function onEnterGroup(groupId: string) {
        try {
            await fetchGroup(groupId)
            navigate(`/group/${groupId}`)
        } catch (error) {
            setError(
                error instanceof ApiError && error.status === 403
                    ? "You no longer have access to that group."
                    : apiErrorMessage(error, "Unable to open that group.")
            )
        }
    }

    return (
        <PageShell>
            <section className="page-header">
                <h1>Groups</h1>
                <p>Your shared expenses.</p>
            </section>

            {error && (
                <div className="notice error" role="alert">
                    <span>{error}</span>
                    <button onClick={() => {
                        setLoading(true)
                        setError("")
                        setLoadAttempt(value => value + 1)
                    }}>
                        Try again
                    </button>
                </div>
            )}

            <section className="dashboard-grid compact-dashboard">
                <div className="groups-panel">
                    <div className="section-heading">
                        <h2>Your groups</h2>
                        <span className="count-badge">{groups.length}</span>
                    </div>

                    {loading ? (
                        <div className="skeleton-list" role="status" aria-label="Loading groups">
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
