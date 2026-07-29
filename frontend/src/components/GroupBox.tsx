import type { Group } from '../interfaces/interface'



function GroupBox({ group, onEnterGroup }: { group: Group, onEnterGroup: (groupId: string) => void }) {
    function handleEnterGroup() {
        onEnterGroup(group.groupId)
    }

    return (
        <article className="group-card">
            <button className="group-card-main" onClick={handleEnterGroup}>
                <span className="group-avatar" aria-hidden="true">
                    {group.groupName.slice(0, 2).toUpperCase()}
                </span>
                <span className="group-copy">
                    <strong>{group.groupName}</strong>
                    <small>{group.groupMembers.length} {group.groupMembers.length === 1 ? "member" : "members"}</small>
                </span>
                <span className="arrow" aria-hidden="true">→</span>
            </button>
            <div className="member-row" aria-label="Group members">
                {group.groupMembers.map(
                    member => {
                        return <span className="member-chip" key={member.userId}>{member.userGroupName}</span>
                    })}
            </div>
        </article>
    )
}


export default GroupBox
