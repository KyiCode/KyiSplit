import GroupBox from "./GroupBox"
import type { Group } from '../interfaces/interface'


function GroupList({ groups, onEnterGroup }: { groups: Group[], onEnterGroup: (groupId: string)  => void }) {
    return (
        <div className="group-list">
            {groups.map(group => {
                return <GroupBox key={group.groupId} group={group} onEnterGroup={onEnterGroup} />
            })}
        </div>
    )
}

export default GroupList
