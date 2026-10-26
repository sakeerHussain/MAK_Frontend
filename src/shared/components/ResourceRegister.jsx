import { useEffect, useId, useRef, useState } from 'react'
import Icon from './ResourceIcon.jsx'
import './ResourceRegister.css'

export function ResourceFilters({ search, children, activeCount = 0, onReset }) {
  const [open, setOpen] = useState(() => window.matchMedia('(min-width: 1100px)').matches)
  const id = useId()
  return <>
    <div className={`resource-toolbar ${open ? 'is-open' : ''}`}>
      {search}
      <div className="resource-filter-controls" id={id} hidden={!open}>{children}</div>
      <button className="resource-filter-toggle" type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((value) => !value)}>
        <Icon name="filter" size={18} /> Filters{activeCount > 0 && <span className="resource-count">{activeCount}</span>}
      </button>
    </div>
    {activeCount > 0 && <div className="resource-filter-summary" role="status"><span>{activeCount} active {activeCount === 1 ? 'filter' : 'filters'}</span><button type="button" onClick={onReset}>Reset filters</button></div>}
  </>
}

export function ResourcePresets({ label, items, value, onChange }) {
  return <div className="resource-presets" role="group" aria-label={label}>
    {items.map((item) => <button type="button" key={item.value} aria-pressed={item.value === value} onClick={() => onChange(item.value)}>{item.label}<span className="resource-count">{item.count}</span></button>)}
  </div>
}

export function ResourceIndicator({ value, className = '' }) {
  const name = value === 'Complete' ? 'ready' : value === 'Expired' ? 'expired' : 'alert'
  return <span className={`resource-indicator ${value.toLowerCase()} ${className}`}><Icon name={name} size={15} />{value}</span>
}

// Keep the menu inside ReadOnlyScope so existing permission handling still applies.
export function ResourceMenu({ menu, onClose, label, className, children }) {
  const ref = useRef(null)
  const close = useRef(onClose)
  useEffect(() => { close.current = onClose }, [onClose])
  useEffect(() => {
    ref.current?.querySelector('button:not(:disabled)')?.focus()
    const dismiss = () => close.current()
    window.addEventListener('resize', dismiss)
    return () => {
      window.removeEventListener('resize', dismiss)
      if (menu.trigger?.isConnected) menu.trigger.focus({ preventScroll: true })
    }
  }, [menu])
  const onKeyDown = (event) => {
    if (event.key === 'Escape' || event.key === 'Tab') {
      if (event.key === 'Escape') event.preventDefault()
      onClose()
      return
    }
    const items = [...ref.current.querySelectorAll('button:not(:disabled)')]
    const index = items.indexOf(document.activeElement)
    const target = event.key === 'ArrowDown' ? (index + 1) % items.length
      : event.key === 'ArrowUp' ? (index - 1 + items.length) % items.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : -1
    if (target >= 0) { event.preventDefault(); items[target]?.focus() }
  }
  return <>
    <button className="resource-menu-backdrop" type="button" tabIndex={-1} aria-label={`Close ${label}`} onClick={onClose} />
    <div className={`resource-action-menu ${className}`} ref={ref} role="menu" aria-label={label} style={{ left: menu.x, top: menu.y }} onKeyDown={onKeyDown}>{children}</div>
  </>
}
