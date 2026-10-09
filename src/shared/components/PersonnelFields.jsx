import './PersonnelFields.css'
import FormFieldCaption from './FormFieldCaption.jsx'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const money = (value, period) => value === '' || value === null || value === undefined ? '—' : `SAR ${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ${period}`
const display = (value) => value === '' || value === null || value === undefined ? '—' : value

export function PersonnelPersonalFields({ form, setField, kind, onPhoto, onRemovePhoto }) {
  const designationKey = kind === 'driver' ? 'designation' : 'jobTitle'
  return <div className="driver-form-section"><h3>Personal Details</h3><div className="driver-form-grid">
    <label><FormFieldCaption required>Employee ID</FormFieldCaption><input required value={form.employeeId} onChange={(event) => setField('employeeId', event.target.value)} placeholder={kind === 'driver' ? 'DRV-1013' : 'EMP-1011'} /></label>
    <label><FormFieldCaption required>Full Name</FormFieldCaption><input required value={form.name} onChange={(event) => setField('name', event.target.value)} placeholder="Enter full name" /></label>
    <label><FormFieldCaption required>Phone</FormFieldCaption><input required type="tel" value={form.phone} onChange={(event) => setField('phone', event.target.value)} placeholder="+966 5X XXX XXXX" /></label>
    <label>Email<input type="email" value={form.email} onChange={(event) => setField('email', event.target.value)} placeholder="name@example.com" /></label>
    <label>Nationality<input value={form.nationality || ''} onChange={(event) => setField('nationality', event.target.value)} placeholder="e.g. Saudi Arabian" /></label>
    <label><FormFieldCaption required>Designation</FormFieldCaption><input required value={form[designationKey] || ''} onChange={(event) => setField(designationKey, event.target.value)} placeholder={kind === 'driver' ? 'e.g. Chauffeur' : 'e.g. Fleet Coordinator'} /></label>
    <label>ID / Iqama No.<input value={form.idNumber || ''} onChange={(event) => setField('idNumber', event.target.value)} placeholder="ID or Iqama number" /></label>
    <label>Iqama Expiry<input type="date" value={form.iqamaExpiry || ''} onChange={(event) => setField('iqamaExpiry', event.target.value)} /></label>
    <label>Years of Experience<input type="number" min="0" max="80" step="1" value={form.yearsExperience ?? ''} onChange={(event) => setField('yearsExperience', event.target.value)} placeholder="0" /></label>
    <label>Blood Group<select value={form.bloodGroup || ''} onChange={(event) => setField('bloodGroup', event.target.value)}><option value="">Select blood group</option>{BLOOD_GROUPS.map((group) => <option key={group}>{group}</option>)}</select></label>
    <label className="personnel-address-field">Home Address<textarea rows="3" value={form.homeAddress || ''} onChange={(event) => setField('homeAddress', event.target.value)} placeholder="Enter the full home address" /></label>
  </div><div className="personnel-photo-row"><label className="personnel-photo-upload"><span className="personnel-photo-preview">{form.photo?.previewUrl ? <img src={form.photo.previewUrl} alt="Selected profile" /> : <span aria-hidden="true">＋</span>}</span><span className="personnel-photo-copy"><strong>{form.photo?.name || 'Upload Profile Photo'}</strong><small>PNG, JPG, or WebP · max 5 MB</small></span><em>Choose Photo</em><input type="file" accept=".png,.jpg,.jpeg,.webp" aria-label={`Upload ${kind} photo`} onChange={(event) => { if (event.target.files?.[0]) onPhoto(event.target.files[0]); event.target.value = '' }} /></label>{form.photo && <button type="button" className="personnel-remove-photo" onClick={onRemovePhoto}>Remove Photo</button>}</div></div>
}

export function PersonnelChargesFields({ form, setField, kind }) {
  const monthlyKey = kind === 'driver' ? 'monthlyRate' : 'monthlySalary'
  const requiredKey = kind === 'driver' ? 'dailyRate' : 'monthlySalary'
  const fields = [
    ['hourlyRate', 'Hourly Rate', 'hour'],
    ['dailyRate', 'Daily Rate', 'day'],
    [monthlyKey, kind === 'driver' ? 'Monthly Rate' : 'Monthly Salary', 'month'],
  ]
  return <div className="driver-form-section"><h3>Charges</h3><p className="driver-form-help">Enter the applicable amounts in SAR. {kind === 'driver' ? 'Daily rate' : 'Monthly salary'} is required.</p><div className="driver-form-grid personnel-rate-grid">{fields.map(([key, label, period]) => <label key={key}><FormFieldCaption required={key === requiredKey}>{label}</FormFieldCaption><div className="driver-currency-field"><b>SAR</b><input type="number" min="0" step="0.01" required={key === requiredKey} value={form[key] ?? ''} onChange={(event) => setField(key, event.target.value)} placeholder="0.00" aria-label={`${label} in SAR per ${period}`} /></div></label>)}</div></div>
}

export function PersonnelRecordsFields({ form, setField }) {
  return <>
    <div className="driver-form-section"><h3>Identity, Contract & Insurance</h3><div className="driver-form-grid">
      <label>Passport No.<input value={form.passportNumber || ''} onChange={(event) => setField('passportNumber', event.target.value)} placeholder="Passport number" /></label>
      <label>Passport Expiry<input type="date" value={form.passportExpiry || ''} onChange={(event) => setField('passportExpiry', event.target.value)} /></label>
      <label>Contract ID<input value={form.contractId || ''} onChange={(event) => setField('contractId', event.target.value)} placeholder="Contract reference" /></label>
      <label>Contract Expiry<input type="date" value={form.contractExpiry || ''} onChange={(event) => setField('contractExpiry', event.target.value)} /></label>
      <label>Driving Licence No.<input value={form.licenceNumber || ''} onChange={(event) => setField('licenceNumber', event.target.value)} placeholder="Licence number" /></label>
      <label>Driving Licence Expiry<input type="date" value={form.licenceExpiry || ''} onChange={(event) => setField('licenceExpiry', event.target.value)} /></label>
      <label>Insurance No.<input value={form.insuranceNumber || ''} onChange={(event) => setField('insuranceNumber', event.target.value)} placeholder="Insurance number" /></label>
      <label>Insurance Expiry<input type="date" value={form.insuranceExpiry || ''} onChange={(event) => setField('insuranceExpiry', event.target.value)} /></label>
    </div></div>
    <div className="driver-form-section"><h3>Emergency Contacts</h3><div className="driver-form-grid">
      <label>Emergency No. (KSA)<input type="tel" value={form.emergencyKsa || ''} onChange={(event) => setField('emergencyKsa', event.target.value)} placeholder="+966 ..." /></label>
      <label>Emergency No. (Home Country)<input type="tel" value={form.emergencyHome || ''} onChange={(event) => setField('emergencyHome', event.target.value)} placeholder="Country code and number" /></label>
    </div></div>
  </>
}

function ProfileCard({ title, items }) {
  return <section className="driver-panel"><h3>{title}</h3><dl>{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{display(value)}</dd></div>)}</dl></section>
}

export function PersonnelProfileCards({ record, kind }) {
  const designation = kind === 'driver' ? record.designation : record.jobTitle
  return <>
    <ProfileCard title="Personal Details" items={[
      ['Employee ID', record.employeeId], ['Name', record.name], ['Phone', record.phone], ['Email', record.email],
      ['Nationality', record.nationality], ['Designation', designation], ['ID / Iqama No.', record.idNumber],
      ['Iqama Expiry', record.iqamaExpiry], ['Years of Experience', record.yearsExperience], ['Blood Group', record.bloodGroup], ['Home Address', record.homeAddress],
    ]} />
    <ProfileCard title="Category & Employment" items={[
      ['Category', record.category], ...(kind === 'employee' ? [['Department', record.department], ['Manager', record.manager]] : []),
      ['Employment Type', record.employmentType], ['Vendor', record.vendor], ['Status', record.status],
      ['Company ID', record.companyId], ['Date of Joining', record.joinedOn], ['Official No.', record.officialNumber],
    ]} />
    <ProfileCard title="Charges & Records" items={[
      ['Hourly', money(record.hourlyRate, 'hour')], ['Daily', money(record.dailyRate, 'day')], ['Monthly', money(kind === 'driver' ? record.monthlyRate : record.monthlySalary, 'month')],
      ['Passport No.', record.passportNumber], ['Passport Expiry', record.passportExpiry], ['Contract ID', record.contractId], ['Contract Expiry', record.contractExpiry],
      ['Driving Licence No.', record.licenceNumber], ['Driving Licence Expiry', record.licenceExpiry],
      ['Insurance No.', record.insuranceNumber], ['Insurance Expiry', record.insuranceExpiry],
      ['Emergency No. (KSA)', record.emergencyKsa], ['Emergency No. (Home Country)', record.emergencyHome],
    ]} />
  </>
}
