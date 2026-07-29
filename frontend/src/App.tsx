import { Navigate, Route, Routes } from 'react-router-dom'
import MainPage from './pages/MainPage'
import LogInPage from './pages/LogInPage'
import SignUpPage from './pages/SignUpPage'
import GroupPage from './pages/GroupPage'
import AddExpensePage from './pages/AddExpensePage'
import JoinPage from './pages/JoinPage'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <Routes>
      <Route path="/join/:inviteToken" element={<JoinPage />} />
      <Route path="/" element={<ProtectedRoute><MainPage /></ProtectedRoute>} />
      <Route path="/auth" element={<LogInPage />} />
      <Route path="/login" element={<Navigate to="/auth" replace />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/group/:groupId" element={<ProtectedRoute><GroupPage /></ProtectedRoute>} />
      <Route path="/group/:groupId/addexpense" element={<ProtectedRoute><AddExpensePage /></ProtectedRoute>} />
      <Route path="/:groupId/addexpense" element={<ProtectedRoute><AddExpensePage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>

  )
}

export default App
