import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import NewsDashboardPage from './features/news/pages/NewsDashboardPage'


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {window.location.pathname.startsWith('/news/dashboard') ? <NewsDashboardPage /> : <App />}
  </StrictMode>,
)
