import { useEffect, useRef, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Icon from '../../app/AdminIcon.jsx'
import { loadDashboard } from './DashboardApi.js'
import { DASHBOARD_COLORS, operationVehicle, paymentFollowups, reportingDay, scheduleLabel } from './DashboardPresentation.js'
import './DashboardPage.css'

const money = (value) => `SAR ${Number(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const dateLabel = (value) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`))
const badgeClass = (value) => String(value).toLowerCase().replaceAll(' ', '-')

function NewBookingMenu({ onNewBooking }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  useEffect(() => {
    if (!open) return
    const closeOutside = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false) }
    const closeOnEscape = (event) => { if (event.key === 'Escape') { setOpen(false); triggerRef.current?.focus() } }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => { document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', closeOnEscape) }
  }, [open])
  return <div ref={rootRef} className="mak-new-booking">
    <button ref={triggerRef} type="button" className="mak-button mak-button-primary" aria-expanded={open} aria-controls="mak-booking-choices" onClick={() => setOpen(!open)}>
      <Icon name="calendar" size={18} /> New booking <Icon name="chevron" size={15} />
    </button>
    {open && <div id="mak-booking-choices" className="mak-booking-choices" role="group" aria-label="Choose booking type">
      <button type="button" onClick={() => { setOpen(false); onNewBooking('quick') }}><Icon name="plus" /><span><strong>Quick booking</strong><small>Assign a vehicle and book now</small></span></button>
      <button type="button" onClick={() => { setOpen(false); onNewBooking('advance') }}><Icon name="calendar" /><span><strong>Advance booking</strong><small>Reserve now, assign on the trip day</small></span></button>
    </div>}
  </div>
}

function PanelHeader({ title, subtitle, action, onAction, count }) {
  return <div className="mak-panel-header"><div><h2>{title}{count != null && <span className="mak-count-badge">{count}</span>}</h2>{subtitle && <p>{subtitle}</p>}</div>
    {action && <button type="button" className="mak-text-button" onClick={onAction}>{action}<Icon name="arrow" size={16} /></button>}
  </div>
}

function EmptyState({ icon = 'ready', title, detail }) {
  return <div className="mak-dashboard-empty"><Icon name={icon} size={26} /><strong>{title}</strong>{detail && <span>{detail}</span>}</div>
}

function MiniChart({ metric, data }) {
  if (metric.chart === 'fleet') return <div className="mak-mini-fleet" aria-label="Current fleet distribution">
    {data.fleet.map((item, index) => <span key={item.name} title={`${item.name}: ${item.value}`} style={{ flexGrow: item.value, background: DASHBOARD_COLORS[index % DASHBOARD_COLORS.length] }} />)}
  </div>
  if (metric.chart === 'attention') return <ResponsiveContainer width="100%" height="100%"><BarChart data={data.attention}>
    <Bar dataKey="value" name="Items requiring attention" fill="#e35371" radius={[3, 3, 0, 0]} isAnimationActive={false} /><Tooltip cursor={false} labelFormatter={(index) => data.attention[index]?.name || ''} />
  </BarChart></ResponsiveContainer>
  return <ResponsiveContainer width="100%" height="100%"><LineChart data={data.activity}>
    <XAxis dataKey="date" hide />
    <Line dataKey="pickups" name="Scheduled pickups" type="monotone" stroke="#008dca" strokeWidth={2} dot={false} isAnimationActive={false} /><Tooltip labelFormatter={dateLabel} />
  </LineChart></ResponsiveContainer>
}

export default function DashboardPage({ onNavigate, onOpenBooking, onOpenAlert, onOpenInvoice, onNewBooking,
  invoices = [], invoicesLoading = false, invoicesError = '', onRetryInvoices,
  bookings = [], trips = [], vehicles = [], bookingPage = 'Bookings', noticeVisible, onDismissNotice, load = loadDashboard }) {
  const [days, setDays] = useState(7)
  const [refresh, setRefresh] = useState(0)
  const [state, setState] = useState({ loading: true, data: null, error: '' })
  const attentionRef = useRef(null)
  useEffect(() => {
    let active = true
    load(days).then((data) => { if (active) setState({ loading: false, data, error: '' }) })
      .catch((error) => { if (active) setState({ loading: false, data: null, error: error.message }) })
    return () => { active = false }
  }, [days, refresh, load])
  const reload = () => { setState({ loading: true, data: null, error: '' }); setRefresh((value) => value + 1); onRetryInvoices?.() }
  const changePeriod = (value) => { setState({ loading: true, data: null, error: '' }); setDays(Number(value)) }
  if (state.loading) return <section className="mak-dashboard-state" role="status"><Icon name="clock" size={30} /><h2>Loading your dashboard</h2><p>Getting the latest rental activity and fleet figures.</p></section>
  if (state.error) return <section className="mak-dashboard-state"><Icon name="alert" size={30} /><h2>Unable to load dashboard</h2><p role="alert">{state.error}</p><button type="button" className="mak-button mak-button-primary" onClick={reload}><Icon name="reset" />Retry</button></section>
  const data = state.data
  const today = reportingDay()
  const followups = paymentFollowups(invoices, today)
  const openBooking = (record) => onOpenBooking ? onOpenBooking(record.kind, record.id) : onNavigate(record.kind === 'Corporate' ? 'Corporate Trips' : 'Bookings')
  const metrics = [
    { label: 'Active rentals', value: data.activeRentals, note: 'Currently handed over', icon: 'calendar', chart: 'activity', page: data.access.bookings ? bookingPage : null, context: `Pickup activity / ${days} days`, featured: true },
    { label: 'Available vehicles', value: data.availableVehicles ?? '—', note: data.totalVehicles == null ? 'Fleet access is restricted' : `Out of ${data.totalVehicles} total fleet vehicles`, icon: 'fleet', chart: 'fleet', page: data.access.fleet ? 'Fleet' : null, context: data.totalVehicles > 0 ? `${Math.round(data.availableVehicles / data.totalVehicles * 100)}% ready` : 'Current fleet distribution' },
    { label: 'Pickups today', value: data.pickupsToday, note: 'Confirmed, active & completed', icon: 'bookings', chart: 'activity', page: data.access.bookings ? bookingPage : null, context: 'Scheduled pickups / KSA today', tone: 'amber' },
    { label: 'Needs attention', value: data.needsAttention, note: 'Pending bookings & open items', icon: 'alert', chart: 'attention', context: data.needsAttention > 0 ? 'Review needed' : 'All clear', tone: 'red', scroll: true },
  ]
  return <div className="mak-dashboard">
    <header className="mak-dashboard-heading">
      <div className="mak-dashboard-heading-copy"><div className="mak-dashboard-title-row"><h1 id="admin-page-title">Dashboard</h1>
      <div className="mak-dashboard-live"><span className="mak-live-indicator" />Live overview <small>Updated {new Intl.DateTimeFormat('en-GB', { timeZone: data.timezone || 'Asia/Riyadh', hour: '2-digit', minute: '2-digit' }).format(new Date(data.generatedAt))} KSA</small>
        {noticeVisible && <button type="button" className="mak-info-dismiss" title="Dashboard figures are loaded from your database. Dismiss this hint." aria-label="Dismiss live workspace hint" onClick={onDismissNotice}><Icon name="close" size={13} /></button>}
      </div></div><p>Bookings, fleet and collections at a glance.</p></div>
      <div className="mak-heading-actions"><div className="mak-dashboard-controls"><label><span className="mak-control-label">Period</span><select aria-label="Dashboard period" value={days} onChange={(event) => changePeriod(event.target.value)}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select></label><button type="button" className="mak-button mak-button-secondary mak-refresh" onClick={reload}><Icon name="reset" size={16} /><span>Refresh</span></button></div>{onNewBooking && <NewBookingMenu onNewBooking={onNewBooking} />}</div>
    </header>
    <div className="mak-dashboard-kpis" aria-label="Dashboard key metrics">{metrics.map((metric) => <article className={`mak-metric ${metric.featured ? 'is-featured' : ''} tone-${metric.tone || 'blue'}`} key={metric.label}>
      <div className="mak-metric-label"><span className="mak-metric-icon"><Icon name={metric.icon} size={22} /></span><h2>{metric.label}</h2>
        {(metric.page || metric.scroll) && <button type="button" className="mak-metric-link" aria-label={`View ${metric.label.toLowerCase()}`} onClick={() => metric.scroll ? attentionRef.current?.scrollIntoView({ block: 'start' }) : onNavigate(metric.page)}><Icon name="next" size={16} /></button>}
      </div>
      <strong className="mak-metric-number">{metric.value}</strong><p>{metric.note}</p>
      <div className="mak-metric-bottom"><small>{metric.context}</small><div className="mak-metric-chart" role="img" aria-label={metric.chart === 'activity' ? `Pickup activity over ${days} days` : metric.chart === 'fleet' ? 'Current fleet distribution' : 'Current items by attention category'}><MiniChart metric={metric} data={data} /></div></div>
    </article>)}</div>

    <div className={`mak-dashboard-workspace ${!data.financial ? 'without-finance' : ''}`}>
      <section className="mak-dashboard-panel mak-operations">
        <PanelHeader title="Today’s operations" subtitle="Urgent handovers, pickups and returns / Saudi Arabia time" action={data.access.bookings ? 'View bookings' : null} onAction={() => onNavigate(bookingPage)} />
        {data.operations && <>
          <div className="mak-operation-summary">{[['Pending handovers', data.operations.pendingHandovers], ['Returns today', data.operations.returnsToday], ['Overdue returns', data.operations.overdueReturns], ['Advance assignments', data.operations.unassignedAdvance]].map(([label, value], index) => <div key={label} className={index === 2 && value > 0 ? 'is-overdue' : ''}><span>{label}</span><strong>{value}</strong></div>)}</div>
          {data.operations.items.length ? <div className="mak-dashboard-table-scroll" tabIndex={0} aria-label="Today's operations table"><table className="mak-operations-table"><thead><tr><th>Booking</th><th>Customer / vehicle</th><th>Schedule (KSA)</th><th>Assignment</th><th>Next action</th></tr></thead><tbody>
            {data.operations.items.map((item) => {
              const vehicle = operationVehicle(item, bookings, trips, vehicles)
              return <tr key={`${item.kind}:${item.id}`}><td><button type="button" className="mak-record-link" onClick={() => openBooking(item)}>{item.reference}</button><small>{item.kind}</small></td>
                <td><strong className="mak-table-customer">{item.customer}</strong><small>{vehicle.name}{vehicle.detail && ` · ${vehicle.detail}`}</small></td>
                <td><span>Pickup: {scheduleLabel(item.pickupAt)}</span><small className={item.priority === 0 ? 'mak-overdue-text' : ''}>Return: {scheduleLabel(item.returnAt)}</small></td>
                <td><span className={item.vehicleAssigned ? 'mak-assigned' : 'mak-missing'}><Icon name={item.vehicleAssigned ? 'ready' : 'alert'} size={12} />{item.vehicleAssigned ? 'Vehicle assigned' : 'Vehicle missing'}</span><span className={item.driver === 'Unassigned' ? 'mak-missing' : 'mak-assigned'}><Icon name={item.driver === 'Unassigned' ? 'alert' : 'ready'} size={12} />{item.driver === 'Self-drive' ? 'Self-drive' : item.driver === 'Unassigned' ? 'Driver missing' : 'Driver assigned'}</span></td>
                <td><span className={`mak-badge priority-${item.priority}`}>{item.action}</span><button type="button" className="mak-review-booking" onClick={() => openBooking(item)} aria-label={`Review booking ${item.reference}`}>Review booking<Icon name="arrow" size={13} /></button></td>
              </tr>
            })}
          </tbody></table></div> : <EmptyState title={data.access.bookings ? 'No operational actions due' : 'Booking access is restricted'} detail={data.access.bookings ? 'No handovers, returns or advance assignments need attention.' : 'Only modules available to your role are shown.'} />}
          <details className="mak-dashboard-details"><summary>About these priorities</summary><p>Showing {data.operations.items.length} of {data.operations.totalItems} actionable records, with the 12 most urgent shown first. Returns due today may also appear in the overdue count once their scheduled time passes. Advance assignments cover the next 7 days. Self-drive trips do not require a driver.</p></details>
        </>}
      </section>

      {data.financial && <section className="mak-dashboard-panel mak-payment-panel">
        <PanelHeader title="Payment follow-ups" subtitle="Issued invoices with an outstanding balance" action="View invoices" onAction={() => onNavigate('Invoices')} />
        {invoicesLoading ? <div className="mak-dashboard-empty" role="status">Loading invoice balances…</div> : invoicesError ? <div className="mak-dashboard-empty"><p role="alert">Unable to load invoice follow-ups.</p><span>{invoicesError}</span>{onRetryInvoices && <button type="button" className="mak-button mak-button-secondary" onClick={onRetryInvoices}>Retry</button>}</div> : followups.length ? <>
          <div className="mak-payment-list">{followups.slice(0, 3).map(({ invoice, balance, overdue, dueToday }) => <article className="mak-payment-row" key={invoice.id}>
            <span className="mak-payment-icon"><Icon name="invoices" size={23} /></span><div className="mak-payment-content">
              <div className="mak-payment-top"><button type="button" className="mak-record-link" onClick={() => onOpenInvoice ? onOpenInvoice(invoice.id) : onNavigate('Invoices')}>{invoice.invoiceNumber}</button><span className={`mak-badge ${overdue ? 'is-danger' : dueToday ? 'is-warning' : 'is-neutral'}`}>{overdue ? 'Overdue' : dueToday ? 'Due today' : 'Outstanding'}</span></div>
              <strong className="mak-payment-customer">{invoice.billTo.name}</strong><span className="mak-payment-source">{invoice.sources.map((source) => source.reference).join(', ')}</span>
              <strong className="mak-payment-amount">{money(balance)}</strong><span className="mak-payment-caption">Balance due{invoice.dueDate ? ` · ${dateLabel(invoice.dueDate)}` : ''}</span>
              <button type="button" className="mak-text-button" onClick={() => onOpenInvoice ? onOpenInvoice(invoice.id) : onNavigate('Invoices')}>Open invoice<Icon name="arrow" size={15} /></button>
            </div>
          </article>)}</div><p className="mak-panel-footnote">Showing {Math.min(3, followups.length)} of {followups.length} outstanding invoices. Overdue balances appear first.</p>
        </> : <EmptyState title="No outstanding invoice balances" detail="Drafts, voided invoices and fully paid invoices are excluded." />}
      </section>}
    </div>

    <div className="mak-dashboard-chart-grid">
      <section className="mak-dashboard-panel"><PanelHeader title="Rental activity" subtitle={`${dateLabel(data.from)} – ${dateLabel(data.to)} / grouped by scheduled pickup date`} />
        <div className="mak-rental-chart" role="img" aria-label="Individual bookings, corporate trips and completed records by scheduled pickup date">
          <ResponsiveContainer width="100%" height="100%"><ComposedChart data={data.activity} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#e6edf5" /><XAxis dataKey="date" tickFormatter={dateLabel} minTickGap={30} tick={{ fontSize: 10, fill: '#7c8da3' }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#7c8da3' }} axisLine={false} tickLine={false} />
            <Tooltip labelFormatter={dateLabel} contentStyle={{ borderRadius: 10, border: '1px solid #e3e9ef', fontSize: 12 }} /><Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10, paddingTop: 12 }} />
            <Line name="Individual bookings" dataKey="individual" stroke="#008dca" strokeWidth={2} dot={false} isAnimationActive={false} /><Line name="Corporate trips" dataKey="corporate" stroke="#55b4ec" strokeWidth={2} dot={false} isAnimationActive={false} /><Line name="Completed records" dataKey="completed" stroke="#102a43" strokeWidth={2} dot={false} isAnimationActive={false} />
          </ComposedChart></ResponsiveContainer>
        </div><details className="mak-dashboard-details"><summary>How activity is counted</summary><p>Cancelled bookings are excluded. Completed records are grouped by their pickup date, not the completion date.</p></details>
      </section>
      <section className="mak-dashboard-panel"><PanelHeader title="Fleet status" subtitle="Current fleet and vehicle availability" action={data.access.fleet ? 'View fleet' : null} onAction={() => onNavigate('Fleet')} />
        {data.totalVehicles > 0 ? <>
          <div className="mak-fleet-track" role="img" aria-label={`Fleet distribution across ${data.totalVehicles} vehicles`}>{data.fleet.map((item, index) => <span key={item.name} style={{ flexGrow: item.value, background: DASHBOARD_COLORS[index % DASHBOARD_COLORS.length] }} title={`${item.name}: ${item.value}`}>{item.value > 0 && item.value}</span>)}</div>
          <div className="mak-fleet-total"><strong>{data.totalVehicles}</strong><span>Total vehicles</span></div><div className="mak-fleet-breakdown">{data.fleet.map((item, index) => <div key={item.name}><i style={{ background: DASHBOARD_COLORS[index % DASHBOARD_COLORS.length] }} /><span>{item.name}</span><strong>{item.value}</strong><small>{Math.round(item.value / data.totalVehicles * 100)}%</small></div>)}</div>
        </> : <EmptyState icon="fleet" title={data.access.fleet ? 'No vehicles added yet' : 'Fleet access is restricted'} detail={data.access.fleet ? 'Your fleet distribution will appear here.' : 'Only modules available to your role are shown.'} />}
      </section>
    </div>

    {data.financial && <section className="mak-dashboard-panel mak-financial-summary"><PanelHeader title="Financial summary" subtitle="Issued invoices and recorded collections / SAR" />
      <div className="mak-financial-grid">{[['Issued invoice value', data.financial.issuedValue, `Selected ${days}-day period / includes VAT`, 'invoices'], ['Net invoice collections', data.financial.netCollections, 'Selected period / payments less refunds', 'wallet'], ['Outstanding balance', data.financial.outstandingBalance, 'All issued invoices / current balance', 'billings'], ['Overdue balance', data.financial.overdueBalance, 'Unpaid balance past invoice due date', 'alert']].map(([label, value, note, icon]) => <div key={label}><span><Icon name={icon} size={18} />{label}</span><strong>{money(value)}</strong><small>{note}</small></div>)}</div>
      <details className="mak-dashboard-details"><summary>How financial figures are calculated</summary><p>Collections exclude transferred booking opening balances to avoid treating earlier receipts as new payments. Booking deposits outside the invoice payment ledger are not included. Drafts and voided invoices are excluded.</p></details>
    </section>}

    <div className="mak-dashboard-bottom-grid">
      <section className="mak-dashboard-panel"><PanelHeader title="Recent bookings" subtitle="Latest individual and corporate records" />
        {data.recentBookings.length ? <div className="mak-dashboard-table-scroll" tabIndex={0} aria-label="Recent bookings table"><table><thead><tr><th>Reference</th><th>Customer / Company</th><th>Vehicle</th><th>Pickup (KSA)</th><th className="mak-money-cell">Total</th><th>Status</th></tr></thead><tbody>{data.recentBookings.map((record) => <tr key={`${record.kind}:${record.id}`}><td><button type="button" className="mak-record-link" onClick={() => openBooking(record)}>{record.reference}</button><small>{record.kind}</small></td><td>{record.customer}</td><td>{record.vehicle}</td><td>{scheduleLabel(record.pickupAt)}</td><td className="mak-money-cell">{money(record.totalAmount)}</td><td><span className={`mak-badge status-${badgeClass(record.status)}`}>{record.status}</span></td></tr>)}</tbody></table></div> : <EmptyState icon="calendar" title="No bookings recorded yet" detail="Your latest individual and corporate bookings will appear here." />}
      </section>
      <section ref={attentionRef} className="mak-dashboard-panel mak-attention-panel"><PanelHeader title="Needs attention" subtitle="Items within your access permissions" count={data.needsAttention} />
        <div className="mak-attention-list">{data.attention.map((item) => <button type="button" key={item.name} onClick={() => onNavigate(item.page)}><Icon name={item.page === 'Maintenance' ? 'maintenance' : item.page === 'Invoices' ? 'invoices' : 'bookings'} /><span>{item.name}</span><strong>{item.value}</strong><Icon name="next" size={15} /></button>)}</div>
        {data.needsAttention === 0 && <p className="mak-panel-footnote">No outstanding items in the categories shown.</p>}
        {data.alerts && <><div className="mak-alert-heading"><h3>Alerts & follow-ups <span className="mak-count-badge">{data.alerts.total}</span></h3><p>{data.alerts.expired} expired / {data.alerts.dueSoon} expiring within 30 days</p></div><div className="mak-alert-list">{data.alerts.items.map((item, index) => <button type="button" className="mak-alert-row" key={`${item.page}:${item.id}:${index}`} onClick={() => onOpenAlert ? onOpenAlert(item.page, item.id) : onNavigate(item.page)}><span className={`mak-badge severity-${badgeClass(item.severity)}`}>{item.severity}</span><span><strong>{item.title}</strong><small>{item.detail}</small></span><Icon name="next" size={14} /></button>)}</div>{!data.alerts.items.length && <p className="mak-panel-footnote">No expiry, maintenance, inspection or billing alerts in the categories you can access.</p>}<details className="mak-dashboard-details"><summary>About these alerts</summary><p>Showing up to 12 highest-priority alerts. Maintenance uses saved odometer intervals and the latest completed service schedule. Inspection alerts show the latest recorded poor/damaged condition; they do not confirm that a repair is unresolved.</p></details></>}
      </section>
    </div>
  </div>
}
