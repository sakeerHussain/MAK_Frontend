import { useId, useState } from 'react'
import { IconAlertTriangle, IconArrowRight, IconArrowBackUp, IconBriefcase, IconCalendarEvent, IconCar, IconCheck, IconChevronDown, IconChevronLeft, IconClock, IconDots, IconDownload, IconEye, IconFileInvoice, IconFileText, IconFilter, IconKey, IconLoader2, IconPencil, IconPlus, IconRefresh, IconRoute, IconSearch, IconUserPlus, IconUsers, IconWallet, IconX } from '@tabler/icons-react'
import AdminPageHeader from '../../app/AdminPageHeader.jsx'
import { ResourceMenu } from './ResourceRegister.jsx'
import './RentalRegister.css'

const icons = { warning: IconAlertTriangle, arrow: IconArrowRight, return: IconArrowBackUp, back: IconChevronLeft, briefcase: IconBriefcase, calendar: IconCalendarEvent, truck: IconCar, check: IconCheck, wallet: IconWallet, clock: IconClock, more: IconDots, download: IconDownload, eye: IconEye, invoice: IconFileInvoice, document: IconFileText, filter: IconFilter, key: IconKey, edit: IconPencil, plus: IconPlus, reset: IconRefresh, search: IconSearch, assign: IconUserPlus, customer: IconUsers, close: IconX, cancel: IconX, route: IconRoute }
export function RentalIcon({ name, size = 18 }) {
  const Component = icons[name] || IconFileText
  return <Component size={size} stroke={1.7} aria-hidden="true" />
}
export function RentalHeading({ title, description, children }) {
  return <div className="rental-heading"><AdminPageHeader title={title} description={description} />{children}</div>
}
export function RentalKpis({ label, items }) {
  return <div className="rental-kpis" role="group" aria-label={label} style={{ '--rental-kpi-count': items.length }}>{items.map(({ label: title, value, icon, tone = 'blue', detail, context, summary }) => <div className="rental-kpi" key={title} title={[detail, context].filter(Boolean).join(' · ')}><span className={`rental-kpi-icon ${tone}`}><RentalIcon name={icon} size={22} /></span><div className="rental-kpi-copy"><strong>{value}</strong><span>{title}</span></div><small>{summary || context || detail}</small></div>)}</div>
}
export function RentalFilters({ search, children, summary }) {
  const [open, setOpen] = useState(() => window.matchMedia('(min-width: 1000px)').matches)
  const id = useId()
  return <div className="rental-filters"><div className="rental-search-row">{search}<button type="button" className="rental-filter-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen((value) => !value)}><RentalIcon name="filter" />Filters<IconChevronDown size={15} stroke={1.7} aria-hidden="true" /></button></div><div id={id} className="rental-filter-fields" hidden={!open}>{children}</div>{summary && <div className="rental-register-context">{summary}</div>}</div>
}
export function DateBand({ entry, columns }) {
  return <tr className="rental-date-band"><th colSpan={columns} scope="rowgroup"><span><RentalIcon name="calendar" />{entry.label}<small>{entry.basis}</small></span></th></tr>
}
export function StreamFooter({ sentinelRef, loaded, total, error, loadMore, loading, hasMore, noun }) {
  return <div className="rental-stream-footer" ref={sentinelRef}><span aria-live="polite" aria-atomic="true">{loaded} of {total} {noun} loaded</span><div aria-live="polite" aria-atomic="true">{error ? <div className="rental-stream-error" role="alert"><RentalIcon name="warning" /><span>{error}</span><button type="button" onClick={loadMore}><RentalIcon name="reset" />Retry</button></div> : loading ? <span className="rental-stream-loading" role="status"><IconLoader2 size={18} stroke={1.7} aria-hidden="true" />Displaying more {noun}…</span> : hasMore ? <button type="button" className="rental-load-more" onClick={loadMore}>Load more {noun}</button> : <span>{total ? `All matching ${noun} loaded` : 'No matching records'}</span>}</div></div>
}
export function RentalMenu({ menu, onClose, label, children }) {
  return <ResourceMenu menu={menu} onClose={onClose} label={label} className="rental-action-menu">{children}</ResourceMenu>
}
