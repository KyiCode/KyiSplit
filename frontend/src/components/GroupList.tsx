import GroupBox from "./GroupBox"
import type { Member, Group } from '../interfaces/interface'


function GroupList({ groups, onEnterGroup }: { groups: Group[], onEnterGroup: (groupDetails: Group) => void }) {
    return (
        <div>
            {groups.map(group => {
                return <GroupBox groupName={group.groupName} groupMembers={group.groupMembers} expenses={group.expenses} onEnterGroup={onEnterGroup} />
            })}
        </div>
    )
}

export default GroupList
