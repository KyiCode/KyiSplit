import GroupBox from "./GroupBox"

interface Member {
    memberName: string
    memberEmail: string

}

interface GroupDetailsProp {
    groupName: string
    groupMembers: Member[]
}

function GroupList({ groups, onEnterGroup }: { groups: GroupDetailsProp[], onEnterGroup: (groupDetails: GroupDetailsProp) => void }) {
    return (
        <div>
            {groups.map(group => {
                return <GroupBox groupName={group.groupName} groupMembers={group.groupMembers} onEnterGroup={onEnterGroup} />
            })} 
        </div>
    )
}

export default GroupList
