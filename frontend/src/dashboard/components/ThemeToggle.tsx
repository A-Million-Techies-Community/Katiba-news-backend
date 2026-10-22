import { useContext } from 'react'
import { Moon, Sun } from 'lucide-react'
import { DashboardThemeContext } from './themeContext'
import './workspace-controls.css'

type ThemeToggleProps = { theme?: 'light' | 'dark'; toggleTheme?: () => void }
export function ThemeToggle(props: ThemeToggleProps = {}) {
  const context = useContext(DashboardThemeContext)
  const theme = props.theme ?? context.theme
  const toggleTheme = props.toggleTheme ?? context.toggleTheme
  const label = `Switch to ${theme === 'light' ? 'dark' : 'light'} mode`
  const Icon = theme === 'light' ? Moon : Sun
  return <button className="nd-theme-toggle workspace-theme-toggle" type="button" aria-label={label} aria-pressed={theme === 'dark'} title={label} onClick={toggleTheme}><Icon size={17} strokeWidth={1.8} aria-hidden="true" /><span>{theme === 'light' ? 'Dark' : 'Light'}</span></button>
}
