import { LayoutDashboard, Newspaper, FileText, PenLine, ChartNoAxesCombined, Images, MessageSquare, Settings, UserRound, FolderOpen, ListChecks, LogOut, ShieldCheck } from 'lucide-react'

const icons = {
  dashboard: LayoutDashboard, overview: Newspaper, 'author-dashboard': LayoutDashboard,
  news: Newspaper, articles: FileText, blogs: PenLine, analytics: ChartNoAxesCombined,
  media: Images, comments: MessageSquare, settings: Settings, profile: UserRound,
  stories: ListChecks, categories: FolderOpen, content: FileText, logout: LogOut,
  accounts: ShieldCheck,
}
export function NavigationIcon({ id }: { id: string }) {
  const Icon = icons[id as keyof typeof icons] || LayoutDashboard
  return <Icon size={19} strokeWidth={1.8} aria-hidden="true" className="workspace-nav-icon" />
}
export function navigationLabel(label: string) {
  return label.replace(/^[^\p{L}\p{N}]+/u, '')
}
