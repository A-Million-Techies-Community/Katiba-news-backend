import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import NewsDashboardPage from './features/news/pages/NewsDashboardPage'
import Recovery from './auth/Recovery'
import StaffApplication from './auth/StaffApplication'
import PublicLibrary from './features/public/PublicLibrary'
import Administrator from './features/admin/Administrator'
import Workspace, { StaffEntry, WorkspaceGate } from './auth/Workspace'

let path = window.location.pathname.replace(/\/+$/, '') || '/'
// Preserve existing staff bookmarks.
const legacyLogin: Record<string, string> = { '/editor': '/editor/login', '/edtior': '/editor/login', '/administration': '/administration/login' }
if (legacyLogin[path]) {
  path = legacyLogin[path]
  window.history.replaceState(null, '', path)
}
if (['/latest-news', '/news', '/articles', '/blogs'].includes(path)) {
  const kind = path === '/articles' ? 'articles' : path === '/blogs' ? 'blogs' : 'news'
  window.history.replaceState(null, '', `/read?type=${kind}`)
  path = '/read'
}
const editorRoute = /^\/news\/dashboard\/editor(?:\/|$)/.test(path)
const authorRoute = path.startsWith('/author/') || path.startsWith('/news/dashboard') || path.startsWith('/features/dashboard/')
let page
if (path === '/workspace') page = <StaffEntry />
else if (path === '/writer/apply') page = <StaffApplication role="Writer" />
else if (path === '/editor/apply') page = <StaffApplication role="Editor" />
else if (path === '/writer/login') page = <Workspace role="Author" />
else if (path === '/editor/login') page = <Workspace role="Editor" />
else if (path === '/administration/login') page = <Workspace role="Administrator" />
else if (path === '/workspace/admin') page = <WorkspaceGate role="Administrator"><Administrator /></WorkspaceGate>
else if (path === '/reset-password') page = <Recovery />
else if (path === '/read') page = <PublicLibrary />
else if (editorRoute) page = <WorkspaceGate role="Editor"><NewsDashboardPage /></WorkspaceGate>
else if (authorRoute) page = <WorkspaceGate role="Author">{path.startsWith('/news/dashboard') ? <NewsDashboardPage /> : <App />}</WorkspaceGate>
else page = <App />
createRoot(document.getElementById('root')!).render(<StrictMode>{page}</StrictMode>)
