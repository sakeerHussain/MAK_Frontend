import { useEffect, useRef } from 'react'
import Icon from './AdminIcon.jsx'

const railIcons = {
  OVERVIEW: 'dashboard', OPERATIONS: 'fleet',
  'TRIPS & CUSTOMERS': 'bookings', FINANCE: 'invoices', MANAGEMENT: 'settings',
}

export default function AdminSidebar({ groups, activePage, collapsed, mobileOpen, onToggle, onCloseMobile, onNavigate, user, onLogout }) {
  const sidebarRef = useRef(null)
  const groupRefs = useRef({})
  const activeGroup = groups.find((group) => group.items.some((item) => item.name === activePage))?.label

  useEffect(() => {
    if (!mobileOpen) return
    const previousFocus = document.activeElement
    const sidebar = sidebarRef.current
    sidebar?.querySelector('button')?.focus()
    const handleKeys = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); onCloseMobile(); return }
      if (event.key !== 'Tab') return
      const buttons = [...sidebar.querySelectorAll('button:not(:disabled), a[href]')]
        .filter((button) => button.getClientRects().length)
      if (!buttons.length) return
      const first = buttons[0], last = buttons[buttons.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    sidebar?.addEventListener('keydown', handleKeys)
    return () => { sidebar?.removeEventListener('keydown', handleKeys); previousFocus?.focus() }
  }, [mobileOpen, onCloseMobile])

  const openGroup = (group) => {
    if (collapsed && !mobileOpen) onToggle()
    groupRefs.current[group.label]?.scrollIntoView({ block: 'nearest' })
    if (!group.items.some((item) => item.name === activePage)) onNavigate(group.items[0].name)
  }

  return <aside ref={sidebarRef} className={`mak-side-navigation ${mobileOpen ? 'is-mobile-open' : ''}`}
    aria-label="Main navigation" role={mobileOpen ? 'dialog' : undefined}
    aria-modal={mobileOpen ? 'true' : undefined}>
    <div className="mak-navigation-rail">
      <button type="button" className="mak-rail-brand" onClick={() => onNavigate('Dashboard')} aria-label="MAK admin dashboard" title="MAK admin">
        <img src="/images/mak-admin-logo.jpg" alt="" />
      </button>
      <nav className="mak-rail-groups" aria-label="Module groups">
        {groups.map((group) => <button key={group.label} type="button"
          className={`mak-rail-button ${group.label === activeGroup ? 'is-active' : ''}`}
          aria-label={group.label} aria-current={group.label === activeGroup ? 'true' : undefined}
          title={group.label} onClick={() => openGroup(group)}>
          <Icon name={railIcons[group.label]} size={23} />
          <span className="mak-rail-tooltip">{group.label}</span>
        </button>)}
      </nav>
      <div className="mak-rail-bottom">
        <button className="mak-rail-button" type="button" onClick={onToggle}
          aria-label={collapsed ? 'Pin navigation open' : 'Collapse navigation'}
          aria-expanded={mobileOpen || !collapsed} title={collapsed ? 'Pin navigation open' : 'Collapse navigation'}>
          <Icon name={collapsed ? 'expand' : 'collapse'} size={22} />
        </button>
        <button className="mak-rail-button" type="button" onClick={onLogout} aria-label="Sign out" title="Sign out"><Icon name="power" size={22} /></button>
      </div>
    </div>
    <div className="mak-navigation-panel" id="mak-navigation-panel">
      <div className="mak-navigation-brand">
        <a href="#/dashboard" onClick={(event) => { event.preventDefault(); onNavigate('Dashboard') }} aria-label="MAK International dashboard">
          <img src="/images/mak-admin-logo.jpg" alt="MAK International" width="190" height="51" />
        </a>
        <button type="button" className="mak-navigation-collapse" onClick={mobileOpen ? onCloseMobile : onToggle}
          aria-label={mobileOpen ? 'Close navigation' : collapsed ? 'Pin navigation open' : 'Collapse navigation'}
          aria-expanded={mobileOpen || !collapsed} aria-controls="mak-navigation-panel">
          <Icon name={mobileOpen ? 'close' : collapsed ? 'expand' : 'collapse'} size={19} />
        </button>
      </div>
      <div className="mak-navigation-heading"><span>WORKSPACE</span><strong>Rental Operations</strong></div>
      <nav className="mak-navigation-items" aria-label="Rental operations pages">
        {groups.length ? groups.map((group) => <div className="mak-navigation-group" key={group.label}
          ref={(element) => { groupRefs.current[group.label] = element }}>
          <div className="mak-navigation-group-label">{group.label}</div>
          {group.items.map((item) => <a key={item.name==='Staff & Users'?'Users & Roles':item.name} href={`#/${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
            className={`mak-navigation-link ${activePage === item.name ? 'is-active' : ''}`}
            aria-current={activePage === item.name ? 'page' : undefined}
            onClick={(event) => { if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return; event.preventDefault(); onNavigate(item.name) }}>
            <Icon name={item.icon} size={20} /><span>{item.name==='Staff & Users'?'Users & Roles':item.name}</span>
          </a>)}
        </div>) : <p className="mak-navigation-empty">No matching pages</p>}
      </nav>
      <div className="mak-navigation-account">
        <span className="mak-account-avatar" aria-hidden="true">{user.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span>
        <div><strong>MAK admin</strong><span>{user.role}</span></div>
        <button type="button" className="mak-navigation-collapse" onClick={onLogout} aria-label="Sign out" title="Sign out"><Icon name="power" size={18} /></button>
      </div>
    </div>
  </aside>
}
