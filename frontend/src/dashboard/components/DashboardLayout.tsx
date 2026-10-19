import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import type { SidebarProps } from './Sidebar'
import { DashboardThemeContext } from './themeContext'
import { useDashboardTheme } from '../hooks/useDashboardTheme'
import '../styles/dashboard.css'

export function DashboardLayout({ children, className = '', ...sidebar }: SidebarProps & { children: ReactNode; className?: string }) {
  const theme = useDashboardTheme()
  return <DashboardThemeContext.Provider value={theme}><div className={`nd-shell ${className}`} data-theme={theme.theme}><Sidebar {...sidebar} /><main className="nd-main">{children}</main></div></DashboardThemeContext.Provider>
}
