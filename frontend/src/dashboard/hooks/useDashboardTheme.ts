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
    document.documentElement.dataset.newsroomTheme = theme
    try { localStorage.setItem('katibaNewsroomTheme', theme) } catch { /* Storage is optional. */ }
    return () => { delete document.documentElement.dataset.newsroomTheme }
  }, [theme])
  return { theme, toggleTheme: () => setTheme(current => current === 'light' ? 'dark' : 'light') }
}
