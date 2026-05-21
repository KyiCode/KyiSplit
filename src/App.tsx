import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'
import SignUpForm from './components/SignUpForm.tsx'
import Group from './components/Group.tsx'
import AddGroup from './components/AddGroup.tsx'

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

function App() {
  const [count, setCount] = useState(0)
  const [groups, setGroups] = useState<GroupDetailsProp[]>(initialGroups)

  function handleAddGroup(groupName: string) {
    const newGroup: GroupDetailsProp = {
        groupName: groupName,
        groupMembers: []
    }
    setGroups([...groups, newGroup])  // add new group to groups array
    alert(`Add Group: ${groupName}`)
  }

  return (
    <>
      {groups.map(group => {
        return <Group groupName={group.groupName} groupMembers={group.groupMembers} />
      })} 
      <AddGroup onAddGroup={handleAddGroup}/>
    </>
    
  )
}

export default App
