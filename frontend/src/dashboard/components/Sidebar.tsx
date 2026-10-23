import { NavigationIcon, navigationLabel } from './NavigationIcon'
import { ChevronDown, ChevronRight } from 'lucide-react'
import './workspace-controls.css'
import { signOut } from '../../auth/session'
import { useId, useState } from 'react'
export type SidebarItem = { id: string; label: string; href?: string; parentId?: string }
export type SidebarProps = {
  workspace: string
  items: SidebarItem[]
  activeItem: string
  onNavigate: (id: string) => void
  disabled?: boolean
}

export function Sidebar({ workspace, items, activeItem, onNavigate, disabled }: SidebarProps) {
  const groupPrefix = useId()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  return <aside className="nd-sidebar">
    <a className="nd-brand" href="/"><span className="workspace-brand-mark">K</span><div><strong>Katiba News</strong><small>{workspace}</small></div></a>
    <div className="nd-section-label">WORKSPACE</div>
    <nav aria-label="Workspace navigation">
      {items.filter(item => !item.parentId).map(item => {
        const children = items.filter(child => child.parentId === item.id)
        const expanded = !collapsed[item.id]
        const groupId = `${groupPrefix}-${item.id}`
        return <div key={item.id} className={children.length ? 'nd-nav-group' : undefined}>
          <div className="nd-nav-parent">
          {item.href ? <a className="nd-nav-link" href={disabled ? undefined : item.href} aria-disabled={disabled || undefined}><NavigationIcon id={item.id} /><span>{navigationLabel(item.label)}</span></a> : <button type="button" disabled={disabled} aria-current={activeItem === item.id ? 'page' : undefined} className={activeItem === item.id ? 'active' : ''} onClick={() => onNavigate(item.id)}><NavigationIcon id={item.id} /><span>{navigationLabel(item.label)}</span></button>}
          {children.length > 0 && <button className="nd-nav-disclosure" type="button" disabled={disabled} aria-expanded={expanded} aria-controls={groupId} aria-label={`${expanded ? 'Collapse' : 'Expand'} ${navigationLabel(item.label)}`} onClick={() => setCollapsed(current => ({ ...current, [item.id]: expanded }))}><span aria-hidden="true">{expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span></button>}
          </div>
          {children.length > 0 && <div id={groupId} className="nd-nav-children" hidden={!expanded} role="group" aria-label={navigationLabel(item.label)}>
            {children.map(child => <button key={child.id} type="button" disabled={disabled} aria-current={activeItem === child.id ? 'page' : undefined} className={activeItem === child.id ? 'active' : ''} onClick={() => onNavigate(child.id)}><NavigationIcon id={child.id} /><span>{navigationLabel(child.label)}</span></button>)}
          </div>}
        </div>
      })}
      <button className="nd-sidebar-logout" type="button" disabled={disabled} onClick={() => void signOut('/workspace')}><NavigationIcon id="logout" /><span>Logout</span></button>
    </nav>
    <div className="nd-sidebar-note"><span>◈</span><h3>Good stories<br />build a better Kenya.</h3><p>Keep informing.<br />Keep inspiring.</p></div>
    <a className="nd-back" href="/">← Back to Katiba News</a>
  </aside>
}
