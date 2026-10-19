import Brand from '../../brand/Brand'
export type SidebarItem = { id: string; label: string; href?: string }
export type SidebarProps = {
  workspace: string
  items: SidebarItem[]
  activeItem: string
  onNavigate: (id: string) => void
  disabled?: boolean
}

export function Sidebar({ workspace, items, activeItem, onNavigate, disabled }: SidebarProps) {
  return <aside className="nd-sidebar">
    <a className="nd-brand" href="/"><Brand /><span>Know. Understand. Engage.</span></a>
    <div className="nd-section-label">{workspace}</div>
    <nav aria-label="Workspace navigation">
      {items.map(item => item.href ? <a key={item.id} className="nd-nav-link" href={disabled ? undefined : item.href} aria-disabled={disabled || undefined}>{item.label}</a> : <button key={item.id} type="button" disabled={disabled} aria-current={activeItem === item.id ? 'page' : undefined} className={activeItem === item.id ? 'active' : ''} onClick={() => onNavigate(item.id)}>{item.label}</button>)}
    </nav>
    <div className="nd-sidebar-note"><span>◈</span><h3>Good stories<br />build a better Kenya.</h3><p>Keep informing.<br />Keep inspiring.</p></div>
    <a className="nd-back" href="/">← Back to Katiba News</a>
  </aside>
}
