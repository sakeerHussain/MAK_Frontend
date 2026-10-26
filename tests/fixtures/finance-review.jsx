// Development-only fixture. It renders production components with in-memory data;
// it never saves fixtures to the database, issues an invoice or records a payment.
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '../../src/styles/index.css'
import '../../src/app/AdminShell.css'
import '../../src/app/AdminButtons.css'
import '../../src/app/AdminKpis.css'
import AdminSidebar from '../../src/app/AdminSidebar.jsx'
import { navigation } from '../../src/app/navigation.js'
import { FinanceIcon as Icon } from '../../src/shared/components/FinanceRegister.jsx'
import InvoiceList from '../../src/features/invoices/InvoiceList.jsx'
import BillingsPage from '../../src/features/invoices/BillingsPage.jsx'
import PayrollPage from '../../src/features/payroll/PayrollPage.jsx'
import ReadOnlyScope from '../../src/features/auth/ReadOnlyScope.jsx'

const companies = [{ id: 1, name: 'Al Noor Logistics', billingEmail: 'accounts@example.com', billingPhone: '+966 50 000 0001', billingAddress: 'King Fahd Road', billingCity: 'Al Khobar', billingCountry: 'Saudi Arabia', paymentTerms: 'Net 30' }, { id: 2, name: 'Horizon Trading', billingEmail: '', billingAddress: '', billingCity: '', billingCountry: 'Saudi Arabia' }]
const line = (id, amount) => ({ id, description: 'Vehicle rental services', unit: 'Trip', quantity: 1, unitPrice: amount, taxPercent: 0, discountPercent: 0 })
const invoices = Array.from({ length: 12 }, (_, index) => ({ id: index + 1, invoiceNumber: index < 3 ? '' : `INV-${1024 - index}`, status: index < 3 ? 'Draft' : 'Issued', kind: index % 3 ? 'Corporate' : 'Individual', billTo: { name: index % 2 ? 'Al Noor Logistics' : 'Omar Khalid', email: 'billing@example.com' }, sources: [{ id: index + 100, reference: index % 3 ? `CT-${3031 - index}` : `BK-${2091 - index}`, kind: index % 3 ? 'Corporate' : 'Individual' }], lines: [line(index + 1, index % 2 ? 4600 : 6600)], payments: index === 4 ? [{ id: 1, kind: 'Payment', amount: 2300 }] : index === 5 ? [{ id: 2, kind: 'Payment', amount: 4600 }] : [], createdAt: `2026-10-${String(22 - index).padStart(2, '0')}T10:00:00Z`, issuedAt: index < 3 ? '' : `2026-10-${String(22 - index).padStart(2, '0')}T10:00:00Z`, dueDate: index === 3 || index === 6 ? '2026-10-20' : '2026-10-28' }))
invoices[3] = { ...invoices[3], invoiceNumber: 'INV-1024', kind: 'Corporate', sources: [{ id: 103, reference: 'CT-3031', kind: 'Corporate' }], issuedAt: '2026-10-15T10:00:00Z', lines: [{ ...line(40, 5800), description: 'Vehicle rental charges' }, { ...line(41, 800), description: 'Additional services' }] }
const trips = [2400, 2200, 1800, 2900, 3200].map((amount, index) => ({ id: index + 1, tripId: `CT-${3031 + index}`, status: 'Completed', companyId: index === 2 ? 2 : 1, companyName: index === 2 ? 'Horizon Trading' : 'Al Noor Logistics', projectCode: index === 4 ? 'AIRPORT' : 'SITE-01', returnAt: `2026-10-${Math.min(23, 21 + index)}T10:00:00`, totalAmount: amount, unitPrice: amount, quantity: 1, rateUnit: 'Trip', taxPercent: 0, pickupLocation: 'Al Khobar', destination: 'Dammam', stops: [] }))
const bookings = [{ id: 1, bookingId: 'BK-2091', status: 'Completed', customerName: 'Omar Khalid', customerEmail: 'omar@example.com', customerPhone: '+966 50 000 0002', returnAt: '2026-10-22T10:00:00', totalAmount: 1500, receivedAmount: 500, refundedAmount: 0 }]
const employees = [{ id: 1, employeeId: 'EMP-015', name: 'Sara Ali', status: 'Active', department: 'Finance', employmentType: 'Full-time', hourlyRate: '', dailyRate: 240, monthlySalary: 6000 }]
const drivers = [{ id: 2, employeeId: 'DRV-045', name: 'Ahmed Hassan', status: 'Active', category: 'Chauffeur', employmentType: 'Full-time', hourlyRate: 35, dailyRate: 200, monthlyRate: 4800 }]
const user = { name: 'MAK Admin', role: 'Admin', email: 'admin@example.com' }
export default function Preview() {
  const [showControls, setShowControls] = useState(true)
  const [page, setPage] = useState('Invoices'), [collapsed, setCollapsed] = useState(true), [mobileOpen, setMobileOpen] = useState(false), [readOnly, setReadOnly] = useState(false), [notice, setNotice] = useState('')
  const navigate = (name) => { if (['Payroll', 'Invoices', 'Billings'].includes(name)) { setPage(name); setNotice('') } }
  return <div className={`app-shell mak-admin ${collapsed ? 'sidebar-collapsed' : ''}`}><AdminSidebar groups={navigation} activePage={page} collapsed={collapsed} mobileOpen={mobileOpen} onToggle={() => { setCollapsed(!collapsed); setMobileOpen(!mobileOpen) }} onCloseMobile={() => setMobileOpen(false)} onNavigate={navigate} user={user} onLogout={() => {}} /><div className="workspace"><header className="topbar"><div className="topbar-left"><button type="button" className="icon-button menu-button" aria-label="Toggle navigation" onClick={() => setMobileOpen(!mobileOpen)}><Icon name="more" /></button><label className="global-search"><Icon name="search" /><input placeholder="Search pages..." aria-label="Search sidebar pages" /></label></div><div className="topbar-right"><span className="mak-header-date"><strong>Fri, 23 Oct 2026</strong><span>Saudi Arabia time</span></span><Icon name="users" /><span>MAK_Admin</span></div></header><main className="main-scroll"><div className="content-wrap">{showControls && <nav aria-label="Test fixture controls" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 14, fontSize: 12 }}>{['Payroll', 'Invoices', 'Billings'].map((name) => <button type="button" key={name} onClick={() => navigate(name)}>{name} preview</button>)}<label><input type="checkbox" checked={readOnly} onChange={(event) => setReadOnly(event.target.checked)} /> Read-only test</label><span>In-memory UI test data · No database changes</span><button type="button" onClick={() => setShowControls(false)}>Hide test controls</button></nav>}{notice && <p role="status">{notice}</p>}<ReadOnlyScope enabled={readOnly}>{page === 'Invoices' ? <InvoiceList invoices={invoices} onBillings={() => navigate('Billings')} onOpen={(id) => setNotice(`Open invoice ${id} callback reached`)} onEdit={(id) => setNotice(`Edit draft ${id} callback reached`)} /> : page === 'Billings' ? <BillingsPage bookings={bookings} trips={trips} companies={companies} setCompanies={() => {}} invoices={[]} onCreate={(kind, ids) => setNotice(`Create draft callback reached for ${kind}: ${ids.join(', ')}`)} onInvoices={() => navigate('Invoices')} onReload={() => {}} canEditProfiles={false} /> : <PayrollPage employees={employees} drivers={drivers} loading={false} loadError="" onReload={() => {}} onOpenEmployee={(id) => setNotice(`Employee profile ${id} callback reached`)} onOpenDriver={(id) => setNotice(`Driver profile ${id} callback reached`)} />}</ReadOnlyScope></div></main></div></div>
}
const fixtureRoot = import.meta.hot?.data.root || createRoot(document.getElementById('root'))
fixtureRoot.render(<Preview />)
if (import.meta.hot) import.meta.hot.dispose((data) => { data.root = fixtureRoot })
