import { FinanceEmpty, FinanceFilters, FinanceHeading, FinanceIcon as Icon, FinanceKpis, FinanceReview } from '../../shared/components/FinanceRegister.jsx'
import { ResourceMenu } from '../../shared/components/ResourceRegister.jsx'
import { useState } from 'react'
import { dayKey, periodBounds, sar, shiftDays } from '../bookings/BookingData.js'
import { invoicePaymentStatus, invoiceTotals, lineAmounts, invoiceDaysUntil as daysUntil } from './InvoiceData.js'
import { downloadInvoiceDocument } from './InvoiceExport.js'
import { downloadCsv } from '../../shared/lib/csv.js'
import { rowsToCsv } from '../../shared/lib/recordExport.js'

const dateFor = (invoice, basis) => basis === 'Due date' ? invoice.dueDate : basis === 'Created on' ? invoice.createdAt : invoice.issuedAt || invoice.createdAt

export default function InvoiceList({ invoices, onBillings, onOpen, onEdit, onDiscard, onBillingProfile }) {
  const [selectedId, setSelectedId] = useState(null)
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
    { label: 'Total Invoices', value: periodInvoices.length, note: `${period} · ${dateBasis.toLowerCase()}`, icon: 'invoices', tone: 'purple', secondary: { label: 'Drafts', value: periodInvoices.filter((invoice) => invoice.status === 'Draft').length, note: 'Awaiting review and issue' } },
    { label: 'Due in 7 Days', value: dueSoon.length, note: `${sar(dueSoon.reduce((sum, invoice) => sum + invoiceTotals(invoice).balance, 0))} to collect`, icon: 'clock', tone: 'amber' },
    { label: 'Overdue', value: overdue.length, note: `${sar(overdue.reduce((sum, invoice) => sum + invoiceTotals(invoice).balance, 0))} past due`, icon: 'alert', tone: 'rose' },
    { label: 'Outstanding Balance', value: sar(outstanding), note: `${sar(paid)} received on issued invoices`, icon: 'wallet', tone: 'green' },
  ]
  const customers = [...new Set(invoices.map((invoice) => invoice.billTo.name))].sort()
  const reset = () => { setQuery(''); setKind('All types'); setStatus('All statuses'); setCustomer('All customers'); setBalance('All balances'); setPeriod('All time'); setDateBasis('Issued on'); setSort('Newest first'); setRows(8); setPage(1) }
  const change = (setter, value) => { setter(value); setPage(1) }
  const openMenu = (event, invoice) => { const box = event.currentTarget.getBoundingClientRect(); setMenu({ invoice, trigger: event.currentTarget, x: Math.max(8, Math.min(box.right - 205, window.innerWidth - 215)), y: Math.max(8, Math.min(box.bottom + 5, window.innerHeight - 200)) }) }
  const exportList = () => downloadCsv('invoices-filtered.csv', rowsToCsv(
    ['Invoice Number', 'Bill To', 'Type', 'Sources', 'Created', 'Issued', 'Due', 'Total (SAR)', 'Credits (SAR)', 'Adjusted (SAR)', 'Refund Due (SAR)', 'Paid (SAR)', 'Balance (SAR)', 'Status'],
    filtered.map((invoice) => { const amount = invoiceTotals(invoice); return [invoice.invoiceNumber || `DRAFT-${invoice.id}`, invoice.billTo.name, invoice.kind, invoice.sources.map((source) => source.reference).join(' / '), dayKey(invoice.createdAt), dayKey(invoice.issuedAt) || '', invoice.dueDate, amount.total, amount.credited, amount.adjusted, amount.refundDue, amount.paid, amount.balance, invoicePaymentStatus(invoice, now)] }),
  ))

  const selectedInvoice = visible.find((invoice) => invoice.id === selectedId) || null
  const activeFilters = [kind !== 'All types', customer !== 'All customers', balance !== 'All balances', sort !== 'Newest first'].filter(Boolean).length
  const preview = (invoice) => setSelectedId(invoice.id)
  return <div className="invoice-page finance-page">
    <FinanceHeading title="Invoices" description="Create, issue, and track individual and corporate invoices. Dates use Saudi Arabia time (KSA).">
      <div className="finance-actions"><div role="group" aria-label="Invoice actions"><button type="button" className="booking-secondary" onClick={onBillingProfile}>MAK Billing Profile</button><button type="button" className="booking-secondary" disabled={!filtered.length} onClick={exportList}><Icon name="download" /> Export CSV</button><button type="button" className="booking-primary" onClick={onBillings}><Icon name="plus" /> Create Invoice</button></div><small>Create from completed work in Billings.</small></div>
    </FinanceHeading>
    {downloadError && <p className="booking-error" role="alert">{downloadError}</p>}
    <FinanceKpis label="Invoice KPIs" items={kpis} />
    <div className="finance-tabs" role="group" aria-label="Invoice status shortcuts">{['All statuses', 'Draft', 'Unpaid', 'Partially Paid', 'Paid', 'Credited', 'Refund Due', 'Overdue'].map((item) => <button key={item} type="button" aria-pressed={status === item} onClick={() => change(setStatus, item)}>{item === 'All statuses' ? 'All' : item === 'Draft' ? 'Drafts' : item}</button>)}</div>
    <div className="finance-layout">
      <section className="finance-register" aria-label="Invoice register">
        <div className="finance-toolbar"><label className="finance-search"><Icon name="search" /><input type="search" aria-label="Search invoices" placeholder="Search invoice, customer or source..." value={query} onChange={(event) => change(setQuery, event.target.value)} /></label></div>
        <div className="finance-date-controls"><label>Date based on<select aria-label="Invoice date basis" value={dateBasis} onChange={(event) => change(setDateBasis, event.target.value)}><option>Issued on</option><option>Created on</option><option>Due date</option></select></label><label>Period<select aria-label="Invoice period" value={period} onChange={(event) => change(setPeriod, event.target.value)}>{['All time', 'Today', 'Last 7 days', 'Last 30 days', 'This month', 'Last month', 'Custom range'].map((item) => <option key={item}>{item}</option>)}</select></label>{period === 'Custom range' && <><label>From<input type="date" aria-label="Invoice from date" value={customStart} onChange={(event) => change(setCustomStart, event.target.value)} /></label><label>To<input type="date" aria-label="Invoice to date" value={customEnd} onChange={(event) => change(setCustomEnd, event.target.value)} /></label></>}</div>
        <FinanceFilters activeCount={activeFilters}>
          <label>Type<select aria-label="Filter invoice type" value={kind} onChange={(event) => change(setKind, event.target.value)}><option>All types</option><option>Individual</option><option>Corporate</option></select></label>
          <label>Status<select aria-label="Filter invoice status" value={status} onChange={(event) => change(setStatus, event.target.value)}>{['All statuses', 'Draft', 'Unpaid', 'Partially Paid', 'Paid', 'Credited', 'Refund Due', 'Overdue'].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Customer<select aria-label="Filter bill-to customer" value={customer} onChange={(event) => change(setCustomer, event.target.value)}><option>All customers</option>{customers.map((name) => <option key={name}>{name}</option>)}</select></label>
          <label>Balance<select aria-label="Filter balance" value={balance} onChange={(event) => change(setBalance, event.target.value)}><option>All balances</option><option>Balance due</option><option>Fully paid</option><option>Draft only</option></select></label>
          <label>Sort by<select aria-label="Sort invoices" value={sort} onChange={(event) => change(setSort, event.target.value)}><option>Newest first</option><option>Due soonest</option><option>Highest balance</option><option>Highest total</option></select></label>
          <label>Rows<select aria-label="Invoice rows per page" value={rows} onChange={(event) => change(setRows, Number(event.target.value))}><option value={8}>8</option><option value={15}>15</option><option value={30}>30</option></select></label>
          <button type="button" className="booking-secondary" onClick={reset}><Icon name="reset" /> Reset filters</button>
        </FinanceFilters>
        <div className="finance-context"><span>{filtered.length} of {invoices.length} invoices</span><button className="finance-text-button" type="button" onClick={reset}>Reset filters</button></div>
        {!bounds.valid && <p className="booking-error" role="alert">Start date must be on or before end date.</p>}
        <p className="finance-scroll-hint">Select an invoice to preview. Scroll the table to see all columns.</p>
        <div className="finance-table-scroll" tabIndex={0} role="region" aria-label="Invoice table, scroll for all columns"><table className="finance-table"><thead><tr>{['Invoice', 'Bill To', 'Type / Source', 'Issue / Due', 'Total (SAR)', 'Balance (SAR)', 'Status', 'Actions'].map((label, index) => <th className={index === 4 || index === 5 ? 'finance-money' : ''} key={label} scope="col">{label}</th>)}</tr></thead><tbody>
          {visible.map((invoice) => { const amounts = invoiceTotals(invoice); const state = invoicePaymentStatus(invoice, now); return <tr key={invoice.id} className={selectedInvoice?.id === invoice.id ? 'is-selected' : ''}>
            <td><button type="button" className="finance-reference" aria-label={`Preview invoice ${invoice.invoiceNumber || `draft ${invoice.id}`}`} aria-pressed={selectedInvoice?.id === invoice.id} onClick={() => preview(invoice)}>{invoice.invoiceNumber || `DRAFT-${invoice.id}`}</button></td>
            <td><strong>{invoice.billTo.name}</strong><small>{invoice.billTo.email || 'Billing email needed'}</small></td><td><strong>{invoice.kind}</strong><small>{invoice.sources.map((source) => source.reference).join(', ')}</small></td><td>{dayKey(invoice.issuedAt) || 'Not issued'}<small className={state === 'Overdue' ? 'finance-overdue' : ''}>Due {invoice.dueDate || 'Not set'}</small></td><td className="finance-money">{sar(amounts.total)}</td><td className="finance-money">{sar(amounts.balance)}</td><td><span className={`invoice-pill tone-${state.toLowerCase().replaceAll(' ', '-')}`}>{state}</span></td>
            <td><button type="button" className="finance-icon-button" aria-label={`More actions for ${invoice.invoiceNumber || `draft ${invoice.id}`}`} aria-haspopup="menu" aria-expanded={menu?.invoice.id === invoice.id} onClick={(event) => openMenu(event, invoice)}><Icon name="more" /></button></td>
          </tr> })}
        </tbody></table></div>
        {!visible.length && <FinanceEmpty icon="invoices" title={invoices.length ? 'No invoices match these filters' : 'No invoices yet'}>{invoices.length ? 'Try another date range or reset the filters.' : 'Prepare your first invoice from completed bookings or corporate trips in Billings.'}</FinanceEmpty>}
        <div className="finance-pagination"><span>{filtered.length ? `Showing ${(safePage - 1) * rows + 1}–${Math.min(safePage * rows, filtered.length)} of ${filtered.length}` : 'Showing 0'} invoices</span><div><button type="button" className="finance-icon-button" aria-label="Previous invoice page" disabled={safePage === 1} onClick={() => setPage(safePage - 1)}><Icon name="back" /></button><span>Page {safePage} of {pageCount}</span><button type="button" className="finance-icon-button" aria-label="Next invoice page" disabled={safePage === pageCount} onClick={() => setPage(safePage + 1)}><Icon name="next" /></button></div></div>
      </section>
      <FinanceReview title={selectedInvoice?.invoiceNumber || `Draft ${selectedInvoice?.id}`} active={Boolean(selectedInvoice)} onClose={() => setSelectedId(null)} emptyTitle="Preview an invoice" emptyText="Select an invoice reference to review its dates, sources and balance here." footer={selectedInvoice && <><button className="booking-primary" type="button" onClick={() => onOpen(selectedInvoice.id)}><Icon name="eye" /> Open Invoice</button>{selectedInvoice.status === 'Draft' && <button className="finance-text-button" type="button" onClick={() => onEdit(selectedInvoice.id)}><Icon name="edit" /> Edit Draft</button>}</>}>
        {selectedInvoice && <InvoicePreview invoice={selectedInvoice} now={now} />}
      </FinanceReview>
    </div>
    {menu && <ResourceMenu menu={menu} onClose={() => setMenu(null)} label="Invoice actions" className="finance-action-menu">
      <button role="menuitem" type="button" onClick={() => { onOpen(menu.invoice.id); setMenu(null) }}><Icon name="eye" size={16} /> View Invoice</button>
      {menu.invoice.status === 'Draft' && <button role="menuitem" type="button" onClick={() => { onEdit(menu.invoice.id); setMenu(null) }}><Icon name="edit" size={16} /> Edit Draft</button>}
      {menu.invoice.status === 'Draft' && <button role="menuitem" type="button" onClick={() => { onDiscard(menu.invoice); setMenu(null) }}><Icon name="close" size={16} /> Discard Draft</button>}
      <button role="menuitem" type="button" onClick={async () => { const invoice = menu.invoice; setMenu(null); setDownloadError(''); try { await downloadInvoiceDocument(invoice) } catch (failure) { setDownloadError(failure.message) } }}><Icon name="download" size={16} /> Download</button>
      {menu.invoice.status === 'Issued' && <button role="menuitem" type="button" onClick={() => { onOpen(menu.invoice.id); setMenu(null) }}><Icon name="wallet" size={16} /> Payments</button>}
    </ResourceMenu>}
  </div>
}

function InvoicePreview({ invoice, now }) {
  const amount = invoiceTotals(invoice)
  const state = invoicePaymentStatus(invoice, now)
  return <>
    <span className={`invoice-pill tone-${state.toLowerCase().replaceAll(' ', '-')}`}>{state}</span>
    {state === 'Overdue' && <p className="finance-overdue">{Math.abs(daysUntil(invoice.dueDate, now))} days overdue</p>}
    <dl><dt>Customer</dt><dd>{invoice.billTo.name}</dd><dt>Type / Source</dt><dd>{invoice.kind}<br />{invoice.sources.map((source) => source.reference).join(", ")}</dd><dt>Issue date</dt><dd>{dayKey(invoice.issuedAt) || 'Not issued'}</dd><dt>Due date</dt><dd>{invoice.dueDate || 'Not set'}</dd><dt>Total</dt><dd>{sar(amount.total)}</dd><dt>Credit notes</dt><dd>{sar(amount.credited)}</dd><dt>Adjusted invoice</dt><dd>{sar(amount.adjusted)}</dd><dt>Refund due</dt><dd>{sar(amount.refundDue)}</dd><dt>Received, net</dt><dd>{sar(amount.paid)}</dd><dt>Balance</dt><dd className="finance-review-total">{sar(amount.balance)}</dd></dl>

    <h3>Line items ({invoice.lines.length})</h3><ul className="finance-review-lines">{invoice.lines.slice(0, 4).map((line) => <li key={line.id}><span>{line.description}</span><strong>{sar(lineAmounts(line).total)}</strong></li>)}</ul>
    {invoice.lines.length > 4 && <p>Open the invoice to see all {invoice.lines.length} line items.</p>}
    <p className="finance-preview-note">Line totals include VAT. Open the invoice for all details.</p>
  </>
}
