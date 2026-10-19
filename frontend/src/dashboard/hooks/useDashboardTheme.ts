import { useEffect, useState } from 'react'

export function useDashboardTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('katibaNewsroomTheme')
      if (saved === 'light' || saved === 'dark') return saved
    } catch { /* Fall back to the system preference. */ }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  useEffect(() => {
    try {
      const preferences = JSON.parse(localStorage.getItem('katibaAuthorPreferences') || '{}')
      document.documentElement.dataset.workspaceDensity = preferences.density || 'comfortable'
      document.documentElement.dataset.workspaceMotion = preferences.reduce_motion ? 'reduce' : 'normal'
    } catch { /* Use comfortable layout and regular motion by default. */ }
    const applyPreference = (event: Event) => {
      const preference = (event as CustomEvent<string>).detail
      if (!['light', 'dark', 'system'].includes(preference)) return
      setTheme(preference === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : preference as 'light' | 'dark')
    }
    window.addEventListener('katiba-workspace-theme', applyPreference)
    return () => window.removeEventListener('katiba-workspace-theme', applyPreference)
  }, [])
  useEffect(() => {
    document.documentElement.dataset.newsroomTheme = theme
    try { localStorage.setItem('katibaNewsroomTheme', theme) } catch { /* Storage is optional. */ }
    return () => { delete document.documentElement.dataset.newsroomTheme }
  }, [theme])
  return { theme, toggleTheme: () => setTheme(current => current === 'light' ? 'dark' : 'light') }
}
