import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import MainPage from './pages/MainPage'
import LogInPage from './pages/LogInPage'
import SignUpPage from './pages/SignUpPage'
import GroupPage from './pages/GroupPage'

function App() {

  return (
    <Routes>
      <Route path="/" element={<MainPage />} />
      <Route path="/login" element={<LogInPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/group" element={<GroupPage />} />
    </Routes>

  )
}

export default App
