import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/auth-context'
import { ProfileProvider } from '@/features/profile/profile-context'
import { ProfileThemeProvider } from '@/features/profile/theme-provider'
import './index.css'
import './i18n'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <ProfileProvider>
          <ProfileThemeProvider>
            <App />
          </ProfileThemeProvider>
        </ProfileProvider>
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
)
