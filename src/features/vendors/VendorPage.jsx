import ActionIcon from '../../app/ActionIcon.jsx'
import { useState } from 'react'
import Icon from '../../app/Icon.jsx'
import VendorForm from './VendorForm.jsx'
import VendorProfile from './VendorProfile.jsx'
import { archiveVendor, createVendor, getVendor, saveVendorAttachments, updateVendor, updateVendorStatus } from './VendorApi.js'
import { primaryContact, vendorReferenceCount, VENDOR_STATUSES, VENDOR_TYPES } from './VendorData.js'
import './VendorPage.css'

const initials = (name) => name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
export default function VendorPage({ vendors, setVendors, vehicles, drivers, employees, loading, loadError, onReload, viewVendorId, onViewVendor, onBackVendor }) {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('All types')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [pageSize, setPageSize] = useState(8)
  const [page, setPage] = useState(1)
  const [menu, setMenu] = useState(null)
  const [dialog, setDialog] = useState(null)
  const [selected, setSelected] = useState(null)
  const [actionError, setActionError] = useState('')
  const [actionBusy, setActionBusy] = useState(false)
  const profile = vendors.find((vendor) => vendor.id === viewVendorId)
  const search = query.trim().toLowerCase()
  const filtered = vendors.filter((vendor) => {
    const contactText = vendor.contacts.map((contact) => `${contact.name} ${contact.mobile} ${contact.email}`).join(' ')
    return (!search || `${vendor.vendorId} ${vendor.name} ${vendor.classification} ${contactText}`.toLowerCase().includes(search))
      && (typeFilter === 'All types' || vendor.vendorType === typeFilter)
      && (statusFilter === 'All statuses' || vendor.status === statusFilter)
  })
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)
  const referencesFor = (vendor) => Math.max(vendor.referenceCount || 0, vendorReferenceCount(vendor, vehicles, drivers, employees))
  const openDialog = (kind, vendor = null) => { setSelected(vendor); setDialog(kind); setMenu(null); setActionError('') }
  const closeDialog = () => { if (!actionBusy) { setDialog(null); setSelected(null); setActionError('') } }
  const replaceVendor = (record) => setVendors((current) => current.map((item) => item.id === record.id ? record : item))
  const toggleStatus = async (vendor) => {
    if (actionBusy) return
    setActionBusy(true); setActionError(''); setMenu(null)
    try {
      replaceVendor(await updateVendorStatus(vendor.id, vendor.status === 'Active' ? 'Inactive' : 'Active'))
      if (dialog === 'delete') { setDialog(null); setSelected(null) }
    } catch (error) { setActionError(error.message) }
    finally { setActionBusy(false) }
  }
  const saveVendor = async (draft) => {
    const previous = selected
    const saved = previous ? await updateVendor(previous.id, draft) : await createVendor(draft)
    try {
      const complete = await saveVendorAttachments(saved.id, draft, previous)
      if (previous) replaceVendor(complete)
      else { setVendors((current) => [complete, ...current]); setPage(1) }
      setDialog(null); setSelected(null)
    } catch (error) {
      const latest = await getVendor(saved.id)
      if (previous) replaceVendor(latest)
      else {
        setVendors((current) => [latest, ...current.filter((item) => item.id !== latest.id)])
        setSelected(latest)
        setDialog('edit')
        setActionError(`Vendor details saved, but an attachment failed: ${error.message}. Add that attachment again.`)
        return
      }
      throw new Error(`Vendor details saved, but an attachment failed: ${error.message}. Retry the attachment.`, { cause: error })
    }
  }
  const deleteVendor = async () => {
    if (!selected || actionBusy) return
    setActionBusy(true); setActionError('')
    try {
      await archiveVendor(selected.id)
      setVendors((current) => current.filter((item) => item.id !== selected.id))
      if (viewVendorId === selected.id) onBackVendor()
      setDialog(null); setSelected(null)
    } catch (error) { setActionError(error.message) }
    finally { setActionBusy(false) }
  }
  const showMenu = (event, vendor) => { if (menu?.id === vendor.id) { setMenu(null); return }; const box = event.currentTarget.getBoundingClientRect(); setMenu({ id: vendor.id, vendor, x: Math.max(8, Math.min(box.right - 207, window.innerWidth - 218)), y: Math.max(8, Math.min(box.bottom + 5, window.innerHeight - 218)) }) }
  const reset = () => { setQuery(''); setTypeFilter('All types'); setStatusFilter('All statuses'); setPage(1) }
  return <div className="vendor-page">
    {loadError && <div className="vendor-error" role="alert">{loadError} <button type="button" onClick={onReload}>Retry</button></div>}
    {actionError && !dialog && <div className="vendor-error" role="alert">{actionError}</div>}
    {viewVendorId ? loading && !profile ? <div className="vendor-panel vendor-not-found">Loading vendor…</div> : <VendorProfile vendor={profile} onBack={onBackVendor} onEdit={() => openDialog('edit', profile)} onStatus={() => toggleStatus(profile)} /> : <>
      <div className="admin-page-actions" role="group" aria-label="Vendor actions"><button type="button" className="vendor-primary" onClick={() => openDialog('add')}><ActionIcon name="plus" size={17} /> Add Vendor</button></div>
      <section className="vendor-panel vendor-list" aria-labelledby="vendor-list-title"><div className="vendor-list-heading"><div><h2 id="vendor-list-title">All Vendors <span>{vendors.length}</span></h2></div><div className="vendor-mini-stats"><span><i className="active" />{vendors.filter((item) => item.status === 'Active').length} active</span><span><i className="inactive" />{vendors.filter((item) => item.status === 'Inactive').length} inactive</span></div></div>
        <div className="vendor-toolbar"><label className="vendor-search"><Icon name="search" size={16} /><input type="search" aria-label="Search vendors" placeholder="Search ID, name, contact, phone..." value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} /></label><select aria-label="Filter vendor type" value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value); setPage(1) }}><option>All types</option>{VENDOR_TYPES.map((option) => <option key={option}>{option}</option>)}</select><select aria-label="Filter vendor status" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1) }}><option>All statuses</option>{VENDOR_STATUSES.map((option) => <option key={option}>{option}</option>)}</select><select aria-label="Rows per page" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1) }}><option value={8}>8 rows</option><option value={12}>12 rows</option><option value={20}>20 rows</option></select></div>
        <div className="vendor-table-scroll"><table className="vendor-table"><thead><tr><th>ID</th><th>Name</th><th>Contact</th><th>Phone</th><th>Commission %</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visible.map((vendor) => { const contact = primaryContact(vendor); return <tr key={vendor.id}><td className="vendor-id">{vendor.vendorId}</td><td><button className="vendor-name-link" type="button" onClick={() => onViewVendor(vendor.id)}><span className="vendor-avatar">{initials(vendor.name)}</span><span><strong>{vendor.name}</strong><small>{vendor.vendorType} · {vendor.classification || 'Unclassified'}</small></span></button></td><td><strong>{contact.name}</strong><small>{contact.email || 'No email'}</small></td><td>{contact.mobile}</td><td className="vendor-commission">{Number(vendor.commission).toFixed(2)}%</td><td><span className={`vendor-status ${vendor.status.toLowerCase()}`}>{vendor.status}</span></td><td><button type="button" className="vendor-more" aria-label={`More actions for ${vendor.name}`} aria-expanded={menu?.id === vendor.id} onClick={(event) => showMenu(event, vendor)}><ActionIcon name="more" size={19} /></button></td></tr> })}</tbody></table>{!visible.length && <div className="vendor-empty"><strong>{loading ? 'Loading vendors…' : 'No vendors found'}</strong><p>{loading ? 'Fetching vendor records.' : 'Try another search or clear the filters.'}</p>{!loading && <button type="button" onClick={reset}>Clear filters</button>}</div>}</div>
        <div className="vendor-pagination"><span>{filtered.length ? `Showing ${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)} of ${filtered.length} vendors` : 'Showing 0 vendors'}</span><div><button type="button" aria-label="Previous page" disabled={safePage === 1} onClick={() => setPage(safePage - 1)}><Icon name="back" size={15} /></button><span>Page {safePage} of {pageCount}</span><button type="button" aria-label="Next page" disabled={safePage === pageCount} onClick={() => setPage(safePage + 1)}><Icon name="arrow" size={15} /></button></div></div>
      </section>
      {menu && <><button type="button" className="vendor-menu-backdrop" aria-label="Close vendor actions" onClick={() => setMenu(null)} /><div className="vendor-action-menu" role="menu" style={{ left: menu.x, top: menu.y }}><button role="menuitem" type="button" onClick={() => { onViewVendor(menu.vendor.id); setMenu(null) }}><ActionIcon name="eye" size={16} /> View Profile</button><button role="menuitem" type="button" onClick={() => openDialog('edit', menu.vendor)}><ActionIcon name="edit" size={16} /> Edit</button><button role="menuitem" type="button" onClick={() => toggleStatus(menu.vendor)}><ActionIcon name="power" size={16} /> {menu.vendor.status === 'Active' ? 'Deactivate' : 'Activate'}</button><div className="vendor-menu-separator" /><button role="menuitem" type="button" className="danger" onClick={() => openDialog('delete', menu.vendor)}><ActionIcon name="trash" size={16} /> Delete</button></div></>}
    </>}
    {dialog && <div className="vendor-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog() }}><div className={`vendor-dialog ${dialog === 'delete' ? '' : 'wide'}`} role="dialog" aria-modal="true" aria-labelledby="vendor-dialog-title"><div className="vendor-dialog-heading"><div><h2 id="vendor-dialog-title">{dialog === 'add' ? 'Add Vendor' : dialog === 'edit' ? 'Edit Vendor' : 'Delete Vendor'}</h2></div><button type="button" aria-label="Close dialog" onClick={closeDialog} disabled={actionBusy}><Icon name="close" size={19} /></button></div>
      {(dialog === 'add' || dialog === 'edit') && <>{actionError && <p className="vendor-error" role="alert">{actionError}</p>}<VendorForm key={selected?.id || 'new'} initial={selected} vendors={vendors} onCancel={closeDialog} onSave={saveVendor} /></>}
      {dialog === 'delete' && selected && <div className="vendor-delete-content"><p><strong>{selected.name}</strong> · {selected.vendorId}</p>{referencesFor(selected) ? <div className="vendor-delete-warning">This vendor is referenced by {referencesFor(selected)} fleet or personnel record{referencesFor(selected) === 1 ? '' : 's'}. Deactivate it instead to preserve those links.</div> : <div className="vendor-delete-warning">Delete this vendor? It will be removed from the active directory.</div>}{actionError && <p className="vendor-error" role="alert">{actionError}</p>}<div className="vendor-form-actions"><button type="button" className="vendor-secondary" onClick={closeDialog} disabled={actionBusy}>Cancel</button>{referencesFor(selected) ? selected.status === 'Active' && <button type="button" className="vendor-primary" disabled={actionBusy} onClick={() => toggleStatus(selected)}><ActionIcon name="power" size={16} /> Deactivate Vendor</button> : <button type="button" className="vendor-danger" disabled={actionBusy} onClick={deleteVendor}><ActionIcon name="trash" size={16} /> {actionBusy ? 'Deleting…' : 'Delete Vendor'}</button>}</div></div>}
    </div></div>}
  </div>
}
