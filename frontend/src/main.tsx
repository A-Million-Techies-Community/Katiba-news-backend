import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import NewsDashboardPage from './features/news/pages/NewsDashboardPage'
import EditorEntry from './features/news/pages/EditorEntry'

if (['/edtior', '/editor'].includes(window.location.pathname.replace(/\/$/, ''))) {
  window.history.replaceState(null, '', `/editor${window.location.search}${window.location.hash}`)
}

const editorRoute = window.location.pathname === '/editor' || /^\/news\/dashboard\/editor(?:\/|$)/.test(window.location.pathname)
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {editorRoute ? <EditorEntry /> : window.location.pathname.startsWith('/news/dashboard') ? <NewsDashboardPage /> : <App />}
  </StrictMode>,
)
