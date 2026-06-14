import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import MainPage from './pages/MainPage'
import LogInPage from './pages/LogInPage'
import SignUpPage from './pages/SignUpPage'
import GroupPage from './pages/GroupPage'
import AddExpensePage from './pages/AddExpensePage'
import JoinPage from './pages/JoinPage'

import { type Group, type ExpenseType, type Member, type Payment, type Split, type ExpenseMemberAmount } from './interfaces/interface'

function App() {
  const [groups, setGroups] = useState<Group[]>([])
  const [expenses, setExpenses] = useState<ExpenseType[]>([])

  function handleAddGroup(newGroup: Group) {
    setGroups(
      [...groups, newGroup]
    )
  }

  // function handleAddExpense(newExpense: Expense) {
  //   setExpenses(
  //     [...expenses, newExpense]
  //   )
  // }

  return (
    <Routes>
      <Route path="/join/:inviteToken" element={<JoinPage />} />
      <Route path="/" element={<MainPage />} />
      <Route path="/login" element={<LogInPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/group/:groupId" element={<GroupPage />} />
      <Route path="/:groupId/addexpense" element={< AddExpensePage />} />
    </Routes>

  )
}

export default App
