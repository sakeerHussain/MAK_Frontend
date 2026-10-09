import { useState } from 'react'
import Icon from '../../app/Icon.jsx'
import { dayKey, periodBounds, sar, shiftDays } from '../bookings/BookingData.js'
import { invoicePaymentStatus, invoiceTotals } from './InvoiceData.js'
import { downloadInvoiceDocument } from './InvoiceExport.js'
import { downloadCsv } from '../../shared/lib/csv.js'
import { rowsToCsv } from '../../shared/lib/recordExport.js'

const dateFor = (invoice, basis) => basis === 'Due date' ? invoice.dueDate : basis === 'Created on' ? invoice.createdAt : invoice.issuedAt || invoice.createdAt
const daysUntil = (date, now) => Math.round((new Date(`${date}T12:00`) - new Date(`${dayKey(now)}T12:00`)) / 86400000)

export default function InvoiceList({ invoices, onBillings, onOpen, onEdit }) {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState('All types')
  const [status, setStatus] = useState('All statuses')
  const [customer, setCustomer] = useState('All customers')
  const [balance, setBalance] = useState('All balances')
  const [period, setPeriod] = useState('All time')
  const [dateBasis, setDateBasis] = useState('Issued on')
  const [customStart, setCustomStart] = useState(dayKey(shiftDays(new Date(), -29)))
  const [customEnd, setCustomEnd] = useState(dayKey(new Date()))
  const [sort, setSort] = useState('Newest first')
  const [rows, setRows] = useState(8)
  const [page, setPage] = useState(1)
  const [menu, setMenu] = useState(null)
  const [downloadError, setDownloadError] = useState('')
  const now = new Date()
  const bounds = periodBounds(period, customStart, customEnd, now)
  const periodInvoices = invoices.filter((invoice) => {
    const date = dateFor(invoice, dateBasis)
    const key = dayKey(date)
    return key && (!bounds.start || key >= bounds.start) && (!bounds.end || key <= bounds.end)
  })
  const q = query.trim().toLowerCase()
  const filtered = periodInvoices.filter((invoice) => {
    const amount = invoiceTotals(invoice)
    const text = `${invoice.invoiceNumber} ${invoice.billTo.name} ${invoice.billTo.email} ${invoice.sources.map((source) => source.reference).join(' ')}`.toLowerCase()
    return (!q || text.includes(q))
      && (kind === 'All types' || invoice.kind === kind)
      && (status === 'All statuses' || invoicePaymentStatus(invoice, now) === status)
      && (customer === 'All customers' || invoice.billTo.name === customer)
      && (balance === 'All balances' || (balance === 'Balance due' ? amount.balance > 0 && invoice.status === 'Issued' : balance === 'Fully paid' ? amount.balance === 0 && invoice.status === 'Issued' : invoice.status === 'Draft'))
  }).sort((a, b) => {
    if (sort === 'Due soonest') return (a.dueDate || '9999').localeCompare(b.dueDate || '9999')
    if (sort === 'Highest balance') return invoiceTotals(b).balance - invoiceTotals(a).balance
    if (sort === 'Highest total') return invoiceTotals(b).total - invoiceTotals(a).total
    return new Date(b.createdAt) - new Date(a.createdAt)
  })
  const pageCount = Math.max(1, Math.ceil(filtered.length / rows))
  const safePage = Math.min(page, pageCount)
  const visible = filtered.slice((safePage - 1) * rows, safePage * rows)
  const issued = periodInvoices.filter((invoice) => invoice.status === 'Issued')
  const dueSoon = issued.filter((invoice) => invoiceTotals(invoice).balance > 0 && daysUntil(invoice.dueDate, now) >= 0 && daysUntil(invoice.dueDate, now) <= 7)
  const overdue = issued.filter((invoice) => invoicePaymentStatus(invoice, now) === 'Overdue')
  const outstanding = issued.reduce((sum, invoice) => sum + invoiceTotals(invoice).balance, 0)
  const paid = issued.reduce((sum, invoice) => sum + invoiceTotals(invoice).paid, 0)
  const kpis = [
    { label: 'Total Invoices', value: periodInvoices.length, note: `${period} · ${dateBasis.toLowerCase()}`, icon: 'invoices', tone: 'purple' },
    { label: 'Drafts', value: periodInvoices.filter((invoice) => invoice.status === 'Draft').length, note: 'Awaiting review and issue', icon: 'edit', tone: 'blue' },
    { label: 'Due in 7 Days', value: dueSoon.length, note: `${sar(dueSoon.reduce((sum, invoice) => sum + invoiceTotals(invoice).balance, 0))} to collect`, icon: 'clock', tone: 'amber' },
    { label: 'Overdue', value: overdue.length, note: `${sar(overdue.reduce((sum, invoice) => sum + invoiceTotals(invoice).balance, 0))} past due`, icon: 'alert', tone: 'rose' },
    { label: 'Outstanding Balance', value: sar(outstanding), note: `${sar(paid)} received on issued invoices`, icon: 'wallet', tone: 'green' },
  ]
  const customers = [...new Set(invoices.map((invoice) => invoice.billTo.name))].sort()
  const reset = () => { setQuery(''); setKind('All types'); setStatus('All statuses'); setCustomer('All customers'); setBalance('All balances'); setPeriod('All time'); setDateBasis('Issued on'); setSort('Newest first'); setRows(8); setPage(1) }
  const change = (setter, value) => { setter(value); setPage(1) }
  const openMenu = (event, invoice) => { const box = event.currentTarget.getBoundingClientRect(); setMenu({ invoice, x: Math.max(8, Math.min(box.right - 205, window.innerWidth - 215)), y: Math.max(8, Math.min(box.bottom + 5, window.innerHeight - 200)) }) }
  const exportList = () => downloadCsv('invoices-filtered.csv', rowsToCsv(
    ['Invoice Number', 'Bill To', 'Type', 'Sources', 'Created', 'Issued', 'Due', 'Total (SAR)', 'Paid (SAR)', 'Balance (SAR)', 'Status'],
    filtered.map((invoice) => { const amount = invoiceTotals(invoice); return [invoice.invoiceNumber || `DRAFT-${invoice.id}`, invoice.billTo.name, invoice.kind, invoice.sources.map((source) => source.reference).join(' / '), invoice.createdAt.slice(0, 10), invoice.issuedAt?.slice(0, 10) || '', invoice.dueDate, amount.total, amount.paid, amount.balance, invoicePaymentStatus(invoice, now)] }),
  ))
  return <div className="invoice-page">
    {downloadError && <p className="booking-error" role="alert">{downloadError}</p>}
    <div className="invoice-page-actions"><div><span className="booking-demo-mark">RENTAL OPERATIONS</span><h2>Invoices</h2><p>Review drafts, due dates, payments, and outstanding balances across both booking types.</p></div><div className="invoice-action-buttons"><button type="button" className="booking-secondary" disabled={!filtered.length} onClick={exportList}><Icon name="download" size={16} /> Export CSV</button><button type="button" className="booking-primary" onClick={onBillings}><Icon name="plus" size={16} /> Create Invoice</button></div></div>
    <div className="invoice-kpis" aria-label="Invoice KPIs">{kpis.map((item) => <section className={`invoice-kpi invoice-kpi-${item.tone}`} key={item.label}><div className="invoice-kpi-head"><span>{item.label}</span><Icon name={item.icon} size={19} /></div><strong>{item.value}</strong><small>{item.note}</small></section>)}</div>
    <section className="invoice-card invoice-list-card"><div className="invoice-list-top"><div><h3>All Invoices</h3><p>{filtered.length} of {invoices.length} records</p></div><label className="invoice-search"><Icon name="search" size={16} /><input type="search" aria-label="Search invoices" placeholder="Search number, customer, source..." value={query} onChange={(event) => change(setQuery, event.target.value)} /></label></div>
      <div className="invoice-toolbar"><select aria-label="Filter invoice type" value={kind} onChange={(event) => change(setKind, event.target.value)}><option>All types</option><option>Individual</option><option>Corporate</option></select><select aria-label="Filter invoice status" value={status} onChange={(event) => change(setStatus, event.target.value)}><option>All statuses</option><option>Draft</option><option>Unpaid</option><option>Partially Paid</option><option>Paid</option><option>Overdue</option></select><select aria-label="Filter bill-to customer" value={customer} onChange={(event) => change(setCustomer, event.target.value)}><option>All customers</option>{customers.map((name) => <option key={name}>{name}</option>)}</select><select aria-label="Filter balance" value={balance} onChange={(event) => change(setBalance, event.target.value)}><option>All balances</option><option>Balance due</option><option>Fully paid</option><option>Draft only</option></select></div>
      <div className="invoice-toolbar invoice-date-toolbar"><label>Period<select aria-label="Invoice period" value={period} onChange={(event) => change(setPeriod, event.target.value)}><option>All time</option><option>Today</option><option>Last 7 days</option><option>Last 30 days</option><option>This month</option><option>Last month</option><option>Custom range</option></select></label><label>Date based on<select aria-label="Invoice date basis" value={dateBasis} onChange={(event) => change(setDateBasis, event.target.value)}><option>Issued on</option><option>Created on</option><option>Due date</option></select></label>{period === 'Custom range' && <><label>From<input type="date" aria-label="Invoice from date" value={customStart} onChange={(event) => change(setCustomStart, event.target.value)} /></label><label>To<input type="date" aria-label="Invoice to date" value={customEnd} onChange={(event) => change(setCustomEnd, event.target.value)} /></label></>}<label>Sort by<select aria-label="Sort invoices" value={sort} onChange={(event) => change(setSort, event.target.value)}><option>Newest first</option><option>Due soonest</option><option>Highest balance</option><option>Highest total</option></select></label><label>Rows<select aria-label="Invoice rows per page" value={rows} onChange={(event) => { setRows(Number(event.target.value)); setPage(1) }}><option value={8}>8</option><option value={15}>15</option><option value={30}>30</option></select></label><button type="button" className="invoice-reset" onClick={reset}><Icon name="reset" size={14} /> Reset</button></div>
      {!bounds.valid && <p className="booking-error" role="alert">Start date must be on or before end date.</p>}
<div className="invoice-table-scroll"><table className="invoice-table"><thead><tr><th>Invoice</th><th>Bill To</th><th>Type / Source</th><th>Issue / Due</th><th>Total</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visible.map((invoice) => { const amounts = invoiceTotals(invoice); const state = invoicePaymentStatus(invoice, now); return <tr key={invoice.id} className={state === 'Overdue' ? 'invoice-urgent-row' : ''}><td><button type="button" className="invoice-link" onClick={() => onOpen(invoice.id)}>{invoice.invoiceNumber || `DRAFT-${invoice.id}`}</button></td><td><strong>{invoice.billTo.name}</strong><small>{invoice.billTo.email || 'Billing email needed'}</small></td><td><strong>{invoice.kind}</strong><small>{invoice.sources.map((source) => source.reference).join(', ')}</small></td><td><strong>{invoice.issuedAt?.slice(0, 10) || 'Not issued'}</strong><small>Due {invoice.dueDate}</small></td><td>{sar(amounts.total)}</td><td>{sar(amounts.balance)}</td><td><span className={`invoice-pill tone-${state.toLowerCase().replaceAll(' ', '-')}`}>{state}</span></td><td><div className="invoice-row-actions"><button type="button" className="booking-more" aria-label={`More actions for ${invoice.invoiceNumber || `draft ${invoice.id}`}`} aria-expanded={menu?.invoice.id === invoice.id} onClick={(event) => openMenu(event, invoice)}><Icon name="more" size={19} /></button></div></td></tr> })}</tbody></table>{!visible.length && <div className="invoice-empty-table">No invoices match these filters. Try another date range or reset filters.</div>}</div><div className="invoice-pagination"><span>{filtered.length ? `Showing ${(safePage - 1) * rows + 1}–${Math.min(safePage * rows, filtered.length)} of ${filtered.length}` : 'Showing 0'} invoices</span><div><button type="button" disabled={safePage === 1} onClick={() => setPage(safePage - 1)}><Icon name="back" size={15} /></button><span>Page {safePage} of {pageCount}</span><button type="button" disabled={safePage === pageCount} onClick={() => setPage(safePage + 1)}><Icon name="arrow" size={15} /></button></div></div></section>
{menu && <><button type="button" className="booking-menu-backdrop" aria-label="Close invoice actions" onClick={() => setMenu(null)} /><div className="booking-action-menu invoice-action-menu" role="menu" style={{ left: menu.x, top: menu.y }}><button role="menuitem" type="button" onClick={() => { onOpen(menu.invoice.id); setMenu(null) }}><Icon name="eye" size={16} /> View Invoice</button>{menu.invoice.status === 'Draft' && <button role="menuitem" type="button" onClick={() => { onEdit(menu.invoice.id); setMenu(null) }}><Icon name="edit" size={16} /> Edit Draft</button>}<button role="menuitem" type="button" onClick={async () => { const invoice = menu.invoice; setMenu(null); setDownloadError(''); try { await downloadInvoiceDocument(invoice) } catch (failure) { setDownloadError(failure.message) } }}><Icon name="download" size={16} /> Download</button>{menu.invoice.status === 'Issued' && <button role="menuitem" type="button" onClick={() => { onOpen(menu.invoice.id); setMenu(null) }}><Icon name="wallet" size={16} /> Payments</button>}</div></>}
  </div>
}
