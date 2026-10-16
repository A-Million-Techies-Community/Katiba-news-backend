import { useContext } from 'react'
import { DashboardThemeContext } from './themeContext'

export function ThemeToggle() {
  const { theme, toggleTheme } = useContext(DashboardThemeContext)
  const label = `Switch to ${theme === 'light' ? 'dark' : 'light'} mode`
  return <button className="nd-theme-toggle" type="button" aria-label={label} aria-pressed={theme === 'dark'} title={label} onClick={toggleTheme}><span aria-hidden="true">{theme === 'light' ? '☾' : '☀'}</span><span>{theme === 'light' ? 'Dark' : 'Light'}</span></button>
}
