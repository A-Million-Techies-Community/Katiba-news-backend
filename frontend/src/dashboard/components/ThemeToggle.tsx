import { useContext } from 'react'
import { DashboardThemeContext } from './themeContext'
import './workspace-controls.css'

type ThemeToggleProps = { theme?: 'light' | 'dark'; toggleTheme?: () => void }
export function ThemeToggle(props: ThemeToggleProps = {}) {
  const context = useContext(DashboardThemeContext)
  const theme = props.theme ?? context.theme
  const toggleTheme = props.toggleTheme ?? context.toggleTheme
  const label = `Switch to ${theme === 'light' ? 'dark' : 'light'} mode`
  return <button className="nd-theme-toggle workspace-theme-toggle" type="button" aria-label={label} aria-pressed={theme === 'dark'} title={label} onClick={toggleTheme}><span aria-hidden="true">{theme === 'light' ? '🌒' : '☀️'}</span><span>{theme === 'light' ? 'Dark' : 'Light'}</span></button>
}
