import { Navigate, Route, Routes } from 'react-router-dom'

import { ForgotPasswordPage } from '@/pages/forgot-password-page'
import { HomePage } from '@/pages/home-page'
import { LoginPage } from '@/pages/login-page'
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
      <Route path="/protected" element={<HomePage />} />
    </Routes>
  )
}

export default App
