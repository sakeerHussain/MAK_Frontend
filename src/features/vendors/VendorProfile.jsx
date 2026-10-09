import Icon from '../../app/Icon.jsx'
import { primaryContact } from './VendorData.js'
import { downloadVendorAttachment } from './VendorFiles.js'

const show = (value) => String(value ?? '').trim() || '—'

function DetailCard({ title, rows }) {
  return <section className="vendor-panel vendor-profile-card"><h3>{title}</h3><dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{show(value)}</dd></div>)}</dl></section>
}

export default function VendorProfile({ vendor, onBack, onEdit, onStatus }) {
  if (!vendor) return <div className="vendor-panel vendor-not-found"><h2>Vendor not found</h2><button type="button" className="vendor-secondary" onClick={onBack}>Back to Vendors</button></div>
  const contact = primaryContact(vendor)
  return <div className="vendor-profile">
    <button type="button" className="vendor-back" onClick={onBack}><Icon name="back" size={15} /> Back to Vendors</button>
    <section className="vendor-panel vendor-profile-hero"><div className="vendor-profile-avatar"><Icon name="vendor" size={28} /></div><div><small>{vendor.vendorId} · {vendor.vendorType}</small><h2>{vendor.name}</h2><p>{vendor.classification || 'Classification not set'} · {contact.name || 'No contact'}</p><span className={`vendor-status ${vendor.status.toLowerCase()}`}>{vendor.status}</span></div><div className="vendor-profile-actions"><button type="button" className="vendor-secondary" onClick={onStatus}><Icon name="power" size={16} /> {vendor.status === 'Active' ? 'Deactivate' : 'Activate'}</button><button type="button" className="vendor-primary" onClick={onEdit}><Icon name="edit" size={16} /> Edit Vendor</button></div></section>
    <div className="vendor-profile-grid">
      <DetailCard title="Vendor Details" rows={[
        ['Vendor ID', vendor.vendorId], ['Vendor Type', vendor.vendorType], ['Vendor Name', vendor.name], ['CR No.', vendor.crNumber], ['VAT No.', vendor.vatNumber], ['National Address', vendor.nationalAddress], ['Business Classification', vendor.classification], ['Commission', `${Number(vendor.commission || 0).toFixed(2)}%`], ['Status', vendor.status],
      ]} />
      <DetailCard title="Commercial Terms" rows={[
        ['Credit Terms', `${vendor.creditTerms} Days`], ['Contract Start Date', vendor.contractStart], ['Contract End Date', vendor.contractEnd],
      ]} />
      <section className="vendor-panel vendor-profile-card"><h3>Contact People</h3><div className="vendor-profile-contacts">{vendor.contacts.map((person, index) => <div key={person.id || index}><strong>{person.name}{index === 0 && <small>Primary</small>}</strong><span>{person.mobile}</span><span>{person.email || 'No email'}</span></div>)}</div></section>
      <DetailCard title="Bank Details" rows={[
        ['Beneficiary Name', vendor.bank?.beneficiaryName], ['Bank Name', vendor.bank?.bankName], ['IBAN', vendor.bank?.iban], ['Account Number', vendor.bank?.accountNumber], ['SWIFT Code', vendor.bank?.swiftCode], ['Currency', vendor.bank?.currency],
      ]} />
      <section className="vendor-panel vendor-profile-card vendor-profile-attachments"><h3>Attachments</h3>{vendor.attachments.length ? vendor.attachments.map((item) => <div key={item.type}><Icon name="document" size={19} /><span><strong>{item.type}</strong><small>{item.name}</small></span>{(item.url || item.file) && <button type="button" onClick={() => downloadVendorAttachment(item)}><Icon name="download" size={15} /> Download</button>}</div>) : <p>No attachments uploaded.</p>}</section>
    </div>
  </div>
}
