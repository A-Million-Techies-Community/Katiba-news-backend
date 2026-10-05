import { createContext } from 'react'

export const DashboardThemeContext = createContext({ theme: 'light' as 'light' | 'dark', toggleTheme: () => {} })
