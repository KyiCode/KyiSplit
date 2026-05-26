import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import MainPage from './pages/MainPage'
import LogInPage from './pages/LogInPage'
import SignUpPage from './pages/SignUpPage'
import GroupPage from './pages/GroupPage'
import AddExpensePage from './pages/AddExpensePage'

function App() {

  return (
    <Routes>
      <Route path="/" element={<MainPage />} />
      <Route path="/login" element={<LogInPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/group" element={<GroupPage />} />
      <Route path="/addexpense" element={< AddExpensePage />}/>
    </Routes>

  )
}

export default App
