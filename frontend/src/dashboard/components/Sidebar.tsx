export type SidebarItem = { id: string; label: string }
export type SidebarProps = {
  workspace: string
  items: SidebarItem[]
  activeItem: string
  onNavigate: (id: string) => void
  disabled?: boolean
}

export function Sidebar({ workspace, items, activeItem, onNavigate, disabled }: SidebarProps) {
  return <aside className="nd-sidebar">
    <a className="nd-brand" href="/">◈ Katiba News<span>Know. Understand. Engage.</span></a>
    <div className="nd-section-label">{workspace}</div>
    <nav aria-label="Workspace navigation" style={{ display: 'grid', gap: 12 }}>
      {items.map(item => <button key={item.id} type="button" disabled={disabled} aria-current={activeItem === item.id ? 'page' : undefined} className={activeItem === item.id ? 'active' : ''} onClick={() => onNavigate(item.id)}>{item.label}</button>)}
    </nav>
    <div className="nd-sidebar-note"><span>◈</span><h3>Good stories<br />build a better Kenya.</h3><p>Keep informing.<br />Keep inspiring.</p></div>
    <a className="nd-back" href="/">← Back to Katiba News</a>
  </aside>
}
