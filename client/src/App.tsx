import { Navigate, Route, Routes } from 'react-router-dom'

import { ForgotPasswordPage } from '@/pages/forgot-password-page'
import { LoginPage } from '@/pages/login-page'
import { ProtectedPage } from '@/pages/protected-page'
import { SignUpPage } from '@/pages/sign-up-page'
import { UpdatePasswordPage } from '@/pages/update-password-page'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/sign-up" element={<SignUpPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/update-password" element={<UpdatePasswordPage />} />
      <Route path="/protected" element={<ProtectedPage />} />
    </Routes>
  )
}

export default App
