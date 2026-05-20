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

function App() {
  const [count, setCount] = useState(0)

  const member1: Member = { memberName: "tom", memberEmail: "tom@email.com" }
  const member2: Member = { memberName: "claire", memberEmail: "tom@email.com" }
  const member3: Member = { memberName: "sheldon", memberEmail: "tom@email.com" }

  return (
    <>
      <Group groupName = "lol" groupMembers={[member1, member2, member3]} ></Group>
      <Group groupName = "lol" groupMembers={[member1, member2, member3]} ></Group> 
      <Group groupName = "lol" groupMembers={[member1, member2, member3]} ></Group>
      <AddGroup/>
    </>
    
  )
}

export default App
