import { useEffect, useId, useRef, useState } from 'react'
import { IconAlertTriangle, IconArrowRight, IconBuilding, IconCalendarEvent, IconCheck, IconChevronLeft, IconChevronRight, IconClock, IconDownload, IconEye, IconFileInvoice, IconFileText, IconFilter, IconInfoCircle, IconPencil, IconPlus, IconRefresh, IconSearch, IconUsers, IconWallet, IconX, IconDots } from '@tabler/icons-react'
import AdminPageHeader from '../../app/AdminPageHeader.jsx'
import './FinanceRegister.css'

const icons = { alert: IconAlertTriangle, arrow: IconArrowRight, corporate: IconBuilding, bookings: IconCalendarEvent, check: IconCheck, back: IconChevronLeft, next: IconChevronRight, clock: IconClock, download: IconDownload, eye: IconEye, invoices: IconFileInvoice, document: IconFileText, filter: IconFilter, info: IconInfoCircle, edit: IconPencil, plus: IconPlus, reset: IconRefresh, search: IconSearch, users: IconUsers, wallet: IconWallet, close: IconX, more: IconDots }
export function FinanceIcon({ name, size = 18 }) {
  const Component = icons[name] || IconFileText
  return <Component size={size} stroke={1.7} aria-hidden="true" />
}
export function FinanceHeading({ title, description, children }) {
  return <div className="finance-heading"><AdminPageHeader title={title} description={description} />{children}</div>
}
export function FinanceKpis({ label, items }) {
  return <div className="finance-kpis" role="group" aria-label={label}>{items.map((item) => <div className="finance-kpi" key={item.label}>
    <span className={`finance-kpi-icon ${item.tone || 'blue'}`}><FinanceIcon name={item.icon} size={22} /></span>
    <div className="finance-kpi-copy"><strong>{item.value}</strong><span>{item.label}</span></div>
    <small className="finance-kpi-note">{item.note}</small>
    {item.secondary && <div className="finance-kpi-secondary"><span><strong>{item.secondary.value}</strong> {item.secondary.label}</span><small>{item.secondary.note}</small></div>}
  </div>)}</div>
}
export function FinanceFilters({ children, activeCount = 0 }) {
  return <details className="finance-filters"><summary><FinanceIcon name="filter" /> Filters{activeCount > 0 && <span className="finance-count">{activeCount}</span>}</summary><div className="finance-filter-fields">{children}</div></details>
}
export function FinanceEmpty({ icon = 'document', title, children }) {
  return <div className="finance-empty"><FinanceIcon name={icon} size={30} /><strong>{title}</strong><p>{children}</p></div>
}

// The review is an ordinary complementary panel on desktop and a focus-contained
// dialog on mobile. It stays within ReadOnlyScope so existing permissions apply.
export function FinanceReview({ title, subtitle, active, mobileActive = active, onClose, children, footer, emptyTitle = 'Select a record to review', emptyText = 'Preview its details here while keeping the register in view.' }) {
  const id = useId()
  const root = useRef(null)
  const close = useRef(onClose)
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 1200px)').matches)
  useEffect(() => { close.current = onClose }, [onClose])
  useEffect(() => {
    const media = window.matchMedia('(max-width: 1200px)')
    const update = () => setMobile(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    if (mobile || !root.current) return
    const panel = root.current
    const measure = () => {
      const available = `${Math.max(180, Math.floor(window.innerHeight - Math.max(16, panel.getBoundingClientRect().top) - 24))}px`
      if (panel.style.getPropertyValue('--finance-review-available') !== available) panel.style.setProperty('--finance-review-available', available)
    }
    measure()
    const observer = new ResizeObserver(measure)
    const page = panel.closest('.finance-page')
    if (page) observer.observe(page)
    window.addEventListener('resize', measure)
    document.addEventListener('scroll', measure, true)
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); document.removeEventListener('scroll', measure, true) }
  }, [mobile, active])
  useEffect(() => {
    if (!mobile || !mobileActive) return
    const previous = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    root.current?.querySelector('button')?.focus()
    const keydown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current?.(); return }
      if (event.key !== 'Tab') return
      const items = [...root.current.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),[tabindex="0"]')].filter((item) => item.getClientRects().length)
      const first = items[0], last = items.at(-1)
      if (event.shiftKey && (document.activeElement === first || !root.current.contains(document.activeElement))) { event.preventDefault(); last?.focus() }
      if (!event.shiftKey && (document.activeElement === last || !root.current.contains(document.activeElement))) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', keydown)
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', keydown); if (previous?.isConnected) previous.focus({ preventScroll: true }) }
  }, [mobile, mobileActive])
  if (mobile && !mobileActive) return null
  return <>
    {mobile && <button type="button" className="finance-review-scrim" aria-label="Close review panel" tabIndex={-1} onClick={onClose} />}
    <aside ref={root} className={`finance-review ${active ? 'is-active' : ''}`} role={mobile ? 'dialog' : 'complementary'} aria-modal={mobile ? true : undefined} aria-labelledby={id}>
      {active ? <><div className="finance-review-heading"><div><h2 id={id}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button type="button" className="finance-icon-button" aria-label="Close review" onClick={onClose}><FinanceIcon name="close" /></button></div><div className="finance-review-body">{children}</div>{footer && <div className="finance-review-footer">{footer}</div>}</> : <><h2 id={id} className="finance-visually-hidden">Review panel</h2><FinanceEmpty icon="eye" title={emptyTitle}>{emptyText}</FinanceEmpty></>}
    </aside>
  </>
}
