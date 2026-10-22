import ActionIcon from '../../app/ActionIcon.jsx'
import { useState } from 'react'
import Icon from '../../app/Icon.jsx'
import { dayKey, sar } from '../bookings/BookingData.js'
import { sourceIsBilled, invoiceDraftFromSources, invoiceTotals, lineAmounts } from './InvoiceData.js'
import CompanyEditor from '../corporate-trips/CompanyEditor.jsx'
import { saveCustomerRecord } from '../customers/CustomerApi.js'
import '../bookings/BookingPage.css'
import './InvoicePage.css'

const returnedOn = (record) => dayKey(record.actualReturnAt || record.returnAt)
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || '')
const companyFor = (trip, companies) => companies.find((company) => company.id === trip.companyId) || companies.find((company) => company.name === trip.companyName)
const missingDetails = (record, kind, companies) => {
  if (kind === 'Individual') return [!record.customerName && 'Customer name', !validEmail(record.customerEmail) && 'Billing email'].filter(Boolean)
  const company = companyFor(record, companies)
  return [!company && 'Company account', !validEmail(company?.billingEmail) && 'Billing email', !company?.billingAddress && 'Street address', !company?.billingCity && 'City', !company?.billingCountry && 'Country'].filter(Boolean)
}
function dateRange(period) {
  const now = new Date(), start = new Date(now.getFullYear(), now.getMonth(), 1)
  if (period === 'This month') return [dayKey(start), dayKey(now)]
  if (period === 'Last month') return [dayKey(new Date(now.getFullYear(), now.getMonth() - 1, 1)), dayKey(new Date(now.getFullYear(), now.getMonth(), 0))]
  if (period === 'Last 30 days') { const from = new Date(now); from.setDate(from.getDate() - 29); return [dayKey(from), dayKey(now)] }
  return ['', '']
}
export default function BillingsPage({ bookings, trips, companies, setCompanies, invoices, onCreate, onInvoices, loading = false, loadError = '', onReload, canEditProfiles = false }) {
  const [tab, setTab] = useState('Individual')
  const [query, setQuery] = useState(''), [companyId, setCompanyId] = useState(''), [project, setProject] = useState(''), [readiness, setReadiness] = useState('All')
  const [period, setPeriod] = useState('All time'), [from, setFrom] = useState(''), [to, setTo] = useState('')
  const [selected, setSelected] = useState([]), [editingCompany, setEditingCompany] = useState(null), [review, setReview] = useState(null), [error, setError] = useState('')
  const individual = bookings.filter((record) => record.status === 'Completed' && !sourceIsBilled(invoices, 'Individual', record.id))
  const corporate = trips.filter((record) => record.status === 'Completed' && !sourceIsBilled(invoices, 'Corporate', record.id))
  const invalidDates = Boolean(from && to && from > to)
  const filter = (record, kind) => {
    const text = `${record.bookingId || record.tripId} ${record.customerName || record.companyName} ${record.customerPhone || ''} ${record.projectCode || ''}`.toLowerCase()
    const missing = missingDetails(record, kind, companies)
    return !invalidDates && text.includes(query.trim().toLowerCase()) && (!from || returnedOn(record) >= from) && (!to || returnedOn(record) <= to) && (readiness === 'All' || (readiness === 'Ready' ? !missing.length : missing.length)) && (kind !== 'Corporate' || ((!companyId || String(companyFor(record, companies)?.id) === companyId) && (!project || record.projectCode === project)))
  }
  const visibleIndividual = individual.filter((record) => filter(record, 'Individual')).sort((a, b) => returnedOn(a).localeCompare(returnedOn(b)))
  const visibleCorporate = corporate.filter((record) => filter(record, 'Corporate')).sort((a, b) => returnedOn(a).localeCompare(returnedOn(b)))
  const selectedTrips = visibleCorporate.filter((record) => selected.includes(record.id))
  const selectedCompany = selectedTrips.length ? companyFor(selectedTrips[0], companies) : null
  const selectedValue = selectedTrips.reduce((sum, record) => sum + Number(record.totalAmount || 0), 0)
  const changeFilter = (setter, value) => { setter(value); setSelected([]); setError('') }
  const clearFilters = () => { setQuery(''); setCompanyId(''); setProject(''); setReadiness('All'); setPeriod('All time'); setFrom(''); setTo(''); setSelected([]) }
  const toggleTrip = (trip) => {
    const company = companyFor(trip, companies)
    if (!company) return
    setSelected((current) => current.includes(trip.id) ? current.filter((id) => id !== trip.id) : [...current, trip.id])
  }
  const openReview = (kind, ids) => {
    setError('')
    try {
      const draft = invoiceDraftFromSources(ids.map((id) => ({ kind, id })), bookings, trips, companies)
      setReview({ kind, ids, draft })
    } catch (cause) { setError(cause.message) }
  }
  const saveCompany = async (updated) => { const saved = await saveCustomerRecord('Corporate', updated); setCompanies((current) => current.map((company) => company.id === saved.id ? saved : company)); setEditingCompany(null) }
  const kpis = [['Unbilled Bookings', visibleIndividual.length, 'Completed individual rentals'], ['Unbilled Corporate Trips', visibleCorporate.length, 'Completed company trips'], ['Unbilled Value', sar([...visibleIndividual, ...visibleCorporate].reduce((sum, record) => sum + Number(record.totalAmount || 0), 0)), 'Booking totals within filters'], ['Selected Value', sar(selectedValue), `${selectedTrips.length} corporate trips selected`], ['Incomplete Billing Profiles', companies.filter((company) => missingDetails({ companyId: company.id }, 'Corporate', companies).length).length, 'Company profiles across all periods']]
  return <div className="invoice-page billing-workbench">
    <div className="admin-page-actions" role="group" aria-label="Billing actions"><div className="admin-page-action-buttons"><button className="booking-secondary" type="button" disabled={loading} onClick={onReload}><ActionIcon name="reset" size={15} /> Refresh</button><button className="booking-secondary" type="button" onClick={onInvoices}><ActionIcon name="invoices" size={15} /> View Invoices</button></div></div>
    {loadError && <div className="booking-error" role="alert">Billing records could not be loaded: {loadError} <button type="button" disabled={loading} onClick={onReload}>Try again</button></div>}
    {loading && <p role="status">Loading billing records...</p>}
    {!loading && !loadError && <>
    <p className="admin-page-context">Existing drafts and issued invoices reserve their linked trips.</p>
    <div className="invoice-kpis billing-kpis">{kpis.map(([label, value, description], index) => <section key={label} className={`invoice-kpi invoice-kpi-${['purple', 'blue', 'green', 'amber', 'rose'][index]}`}><div className="invoice-kpi-head"><span>{label}</span><Icon name={['bookings', 'corporate', 'wallet', 'check', 'alert'][index]} size={19} /></div><strong>{value}</strong><small>{description}</small></section>)}</div>
    <div className="invoice-tabs" role="tablist" aria-label="Billing workbench tabs">{['Individual', 'Corporate', 'Company Profiles'].map((item) => <button role="tab" aria-selected={tab === item} className={tab === item ? 'active' : ''} key={item} type="button" onClick={() => { setTab(item); clearFilters(); setError('') }}>{item}</button>)}</div>
    {error && <p className="booking-error" role="alert">{error}</p>}
    <section className="invoice-card">
    <div className="invoice-list-top"><div><h3>{tab === 'Company Profiles' ? 'Company Billing Profiles' : `Completed ${tab === 'Individual' ? 'Individual Bookings' : 'Corporate Trips'}`}</h3><p>{tab === 'Company Profiles' ? 'Updated profiles prefill future drafts. Issued invoices retain their saved details.' : 'Oldest completed records appear first. Missing buyer details can be completed in the draft before issuing.'}</p></div></div>
    <div className="invoice-filters billing-filters"><label className="billing-search-filter">Search<input type="search" aria-label="Search billable records" value={query} onChange={(event) => changeFilter(setQuery, event.target.value)} placeholder={tab === 'Company Profiles' ? 'Search company or billing email' : 'Search reference, customer or project'} /></label>
    <label>Readiness<select aria-label="Billing readiness" value={readiness} onChange={(event) => changeFilter(setReadiness, event.target.value)}><option>All</option><option>Ready</option><option>Needs details</option></select></label>
    {tab !== 'Company Profiles' && <><label>Period<select aria-label="Billing period" value={period} onChange={(event) => { const value = event.target.value; setPeriod(value); const range = dateRange(value); setFrom(range[0]); setTo(range[1]); setSelected([]) }}>{['All time', 'This month', 'Last month', 'Last 30 days', 'Custom'].map((value) => <option key={value}>{value}</option>)}</select></label><label>Returned from<input type="date" value={from} onChange={(event) => { changeFilter(setFrom, event.target.value); setPeriod('Custom') }} /></label><label>Returned to<input type="date" value={to} min={from || undefined} onChange={(event) => { changeFilter(setTo, event.target.value); setPeriod('Custom') }} /></label></>}
    {tab === 'Corporate' && <><label>Company<select aria-label="Company" value={companyId} onChange={(event) => { changeFilter(setCompanyId, event.target.value); setProject('') }}><option value="">All companies</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label><label>Project<select aria-label="Project" value={project} onChange={(event) => changeFilter(setProject, event.target.value)}><option value="">All projects</option>{[...new Set(corporate.filter((trip) => !companyId || String(companyFor(trip, companies)?.id) === companyId).map((trip) => trip.projectCode).filter(Boolean))].sort().map((code) => <option key={code}>{code}</option>)}</select></label></>}
    <button type="button" className="booking-secondary" onClick={clearFilters}>Clear filters</button></div>
    {invalidDates && <p className="booking-error" role="alert">Start date must be on or before end date.</p>}
    <div className="invoice-table-scroll"><table className="invoice-table"><thead><tr>{(tab === 'Company Profiles' ? ['Company', 'Billing Email', 'Billing Address', 'Payment Terms', 'Readiness', 'Actions'] : [ ...(tab === 'Corporate' ? ['Select'] : []), 'Reference', tab === 'Corporate' ? 'Company / Project' : 'Customer', 'Returned', 'Total (SAR)', ...(tab === 'Individual' ? ['Net Payments (SAR)'] : []), 'Billing Readiness', 'Actions']).map((label) => <th key={label}>{label}</th>)}</tr></thead><tbody>
    {tab === 'Company Profiles' ? companies.filter((company) => `${company.name} ${company.billingEmail || ''}`.toLowerCase().includes(query.toLowerCase()) && (readiness === 'All' || (readiness === 'Ready' ? !missingDetails({ companyId: company.id }, 'Corporate', companies).length : missingDetails({ companyId: company.id }, 'Corporate', companies).length))).map((company) => { const missing = missingDetails({ companyId: company.id }, 'Corporate', companies); return <tr key={company.id}><td><strong>{company.name}</strong></td><td>{company.billingEmail || '-'}</td><td>{[company.billingAddress, company.billingCity, company.billingCountry].filter(Boolean).join(', ') || '-'}</td><td>{company.paymentTerms || '-'}</td><td><span className={`invoice-pill ${missing.length ? 'tone-overdue' : 'tone-paid'}`}>{missing.length ? 'Needs details' : 'Ready'}</span><small>{missing.join(', ')}</small></td><td><button type="button" className="invoice-link" disabled={!canEditProfiles} title={canEditProfiles ? undefined : 'Customer write permission is required'} onClick={() => setEditingCompany(company)}><Icon name="edit" size={14} /> Edit Profile</button></td></tr> }) : (tab === 'Individual' ? visibleIndividual : visibleCorporate).map((record) => { const missing = missingDetails(record, tab, companies); const company = tab === 'Corporate' ? companyFor(record, companies) : null; const incompatible = tab === 'Corporate' && (!company || Boolean(selectedCompany && selectedCompany.id !== company.id)); return <tr key={record.id}>{tab === 'Corporate' && <td><input type="checkbox" aria-label={`Select ${record.tripId}`} disabled={incompatible} title={incompatible ? 'Select trips from the same company. Clear selection to switch companies.' : ''} checked={selected.includes(record.id)} onChange={() => toggleTrip(record)} /></td>}<td><strong>{record.bookingId || record.tripId}</strong></td><td>{record.customerName || record.companyName}<small>{tab === 'Corporate' ? record.projectCode || 'No project' : record.customerEmail || record.customerPhone}</small></td><td>{returnedOn(record)}</td><td>{sar(record.totalAmount)}</td>{tab === 'Individual' && <td>{sar(Number(record.receivedAmount || 0) - Number(record.refundedAmount || 0))}</td>}<td><span className={`invoice-pill ${missing.length ? 'tone-overdue' : 'tone-paid'}`}>{missing.length ? 'Needs details' : 'Ready'}</span><small>{missing.join(', ')}</small></td><td><button type="button" className="booking-primary" onClick={() => openReview(tab, [record.id])}><ActionIcon name="invoices" size={14} /> Review Charges</button></td></tr> })}
    </tbody></table></div>
    {tab !== 'Company Profiles' && !(tab === 'Individual' ? visibleIndividual : visibleCorporate).length && <div className="invoice-empty-table">No completed, uninvoiced records match these filters.</div>}
    {tab === 'Company Profiles' && !companies.length && <div className="invoice-empty-table">No corporate accounts yet. Add one in Customer to manage its billing profile.</div>}
    {tab === 'Corporate' && <><div className="invoice-selection-bar"><span>{selectedTrips.length} trips selected{selectedCompany ? ` for ${selectedCompany.name}` : ''} / {sar(selectedValue)}</span><div className="billing-toolbar"><button type="button" className="booking-secondary" onClick={() => setSelected([])} disabled={!selectedTrips.length}>Clear selection</button><button type="button" className="booking-primary" disabled={!selectedTrips.length} onClick={() => openReview('Corporate', selectedTrips.map((trip) => trip.id))}><ActionIcon name="invoices" size={14} /> Review Consolidated Charges</button></div></div><p className="invoice-help">Only trips from the selected company can be added. Changing filters clears the selection. Readiness covers buyer details; seller details and charges are validated before issuing.</p></>}
    </section></>}
    {review && <div className="booking-overlay"><div className="booking-dialog wide" role="dialog" aria-modal="true" aria-labelledby="billing-review-title"><div className="booking-dialog-heading"><h2 id="billing-review-title">Review Invoice Charges</h2><button type="button" aria-label="Close charge review" onClick={() => setReview(null)}>Close</button></div><p>{review.draft.billTo.name} / {review.draft.sources.map((source) => source.reference).join(', ')}</p><p className="invoice-help">These are the same line items used to prepare the invoice draft, including approved quote lines where available. Review extra kilometres, waiting and other charges in the draft before saving.</p><div className="invoice-table-scroll"><table className="invoice-table"><thead><tr><th>Description</th><th>Quantity</th><th>Unit Price</th><th>Taxable</th><th>VAT</th><th>Total</th></tr></thead><tbody>{review.draft.lines.map((line) => { const amounts = lineAmounts(line); return <tr key={line.id}><td>{line.description}</td><td>{line.quantity} {line.unit}</td><td>{sar(line.unitPrice)}</td><td>{sar(amounts.net)}</td><td>{line.taxPercent}% / {sar(amounts.tax)}</td><td>{sar(amounts.total)}</td></tr> })}</tbody></table></div><div className="billing-review-totals"><span>Taxable: {sar(invoiceTotals(review.draft).subtotal)}</span><span>VAT: {sar(invoiceTotals(review.draft).tax)}</span><strong>Invoice total: {sar(invoiceTotals(review.draft).total)}</strong></div>{review.ids.some((id) => missingDetails((review.kind === 'Corporate' ? trips : bookings).find((record) => record.id === id), review.kind, companies).length) && <p className="invoice-help">Buyer details are incomplete. You can prepare a draft and complete them before issuing.</p>}<div className="billing-toolbar"><button type="button" className="booking-secondary" onClick={() => setReview(null)}>Cancel</button><button type="button" className="booking-primary" onClick={() => { onCreate(review.kind, review.ids); setReview(null) }}><ActionIcon name="plus" size={14} /> Create Draft</button></div></div></div>}
    {editingCompany && <div className="booking-overlay"><div className="booking-dialog wide" role="dialog" aria-modal="true" aria-labelledby="company-billing-title"><div className="booking-dialog-heading"><h2 id="company-billing-title">Edit Billing Profile / {editingCompany.name}</h2><button type="button" aria-label="Close billing profile" onClick={() => setEditingCompany(null)}>Close</button></div><CompanyEditor key={editingCompany.id} initial={editingCompany} companies={companies} onSave={saveCompany} onCancel={() => setEditingCompany(null)} /></div></div>}
  </div>
}
