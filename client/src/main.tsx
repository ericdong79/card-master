import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { ProfileProvider } from '@/features/profile/profile-context'
import { ProfileThemeProvider } from '@/features/profile/theme-provider'
import './index.css'
import './i18n'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <ProfileProvider>
        <ProfileThemeProvider>
          <App />
        </ProfileThemeProvider>
      </ProfileProvider>
    </HashRouter>
  </StrictMode>,
)
