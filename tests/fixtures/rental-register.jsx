// Isolated, in-memory visual/interaction fixture. Nothing here saves records.
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import BookingPage from '../../src/features/bookings/BookingPage.jsx'
import CorporateTripsPage from '../../src/features/corporate-trips/CorporateTripsPage.jsx'
import CustomerPage from '../../src/features/customers/CustomerPage.jsx'
import AdminSidebar from '../../src/app/AdminSidebar.jsx'
import { navigation } from '../../src/app/navigation.js'
import ReadOnlyScope from '../../src/features/auth/ReadOnlyScope.jsx'
import useRegisterStream from '../../src/shared/hooks/useRegisterStream.js'
import { StreamFooter } from '../../src/shared/components/RentalRegister.jsx'
import '../../src/styles/index.css'
import '../../src/app/AdminShell.css'
import '../../src/app/AdminButtons.css'
import '../../src/app/AdminKpis.css'

const stamp = (day, hour) => { const date = new Date(); date.setDate(date.getDate() + day); date.setHours(hour, 0, 0, 0); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00` }
const records = Array.from({ length: 63 }, (_, index) => ({ id: 10000 + index, bookingId: `BK-DEMO${String(index + 1).padStart(3, '0')}`, tripId: `CT-DEMO${String(index + 1).padStart(3, '0')}`, bookedAt: stamp(-2, 9), pickupAt: stamp(Math.floor(index / 12), 8 + index % 10), returnAt: stamp(Math.floor(index / 12), 19), bookingType: index % 3 ? 'Advance' : 'Quick', customerId: index % 12 + 1, customerName: ['Alex Demo', 'Nadia Demo', 'Omar Demo'][index % 3], customerPhone: '+966 5XX XXX 010', customerEmail: 'demo@example.test', companyId: index % 3 + 1, companyName: ['Crescent Demo', 'Atlas Demo', 'Horizon Demo'][index % 3], contactName: ['Nadia Demo', 'Omar Demo'][index % 2], contactPhone: '+966 5XX XXX 011', contactEmail: 'contact@example.test', projectCode: 'PRJ-001', projectManager: 'Alex Demo', passengerCount: index % 4 + 1, pickupLocation: 'Al Khobar', destination: 'Dammam', status: index === 0 ? 'Active' : index % 4 === 0 ? 'Pending' : 'Confirmed', vehicleId: index % 2 ? null : 1, requestedType: 'Sedan', driverId: null, driverMode: index % 3 ? 'Unassigned' : 'Self-drive', serviceMode: index % 3 ? 'With driver' : 'Self-drive', unitPrice: 300, quantity: 1, rateUnit: 'Day', totalAmount: 300 + index * 10, receivedAmount: index % 2 ? 0 : 100, refundedAmount: 0, taxPercent: 15, notes: '', stops: [{ id: 'pickup', location: 'Al Khobar', waitingMinutes: 0 }, { id: 'stop', location: 'Dhahran', waitingMinutes: 15 }, { id: 'drop', location: 'Dammam', waitingMinutes: 0 }], waitingRatePerHour: 60, includedWaitingMinutes: 0, waitingBillingIncrementMinutes: 15 }))
const individuals = Array.from({ length: 23 }, (_, index) => ({ id: index + 1, name: `Customer Demo ${String(index + 1).padStart(2, '0')}`, phone: '+966 5XX XXX 010', email: 'demo@example.test', status: index % 5 ? 'Active' : 'Inactive', address: 'Al Khobar' }))
const companies = ['Crescent Demo', 'Atlas Demo', 'Horizon Demo'].map((name, index) => ({ id: index + 1, name, billingContactName: 'Alex Demo', billingPhone: '+966 5XX XXX 011', billingEmail: 'billing@example.test', status: 'Active' }))
const vehicles = [{ id: 1, make: 'Toyota', model: 'Camry', registration: 'TRN-010', type: 'Sedan', status: 'Available', dailyRate: 300 }]

export function StreamStates() {
  const [mode, setMode] = useState('normal')
  const [key, setKey] = useState(0)
  const prepareBatch = () => mode === 'fail' ? Promise.reject(new Error('Fixture failure')) : mode === 'hold' ? new Promise(() => {}) : Promise.resolve()
  const stream = useRegisterStream({ rows: records, resetKey: String(key), detailOpen: false, prepareBatch })
  return <section className="rental-register-page"><h1>Stream state fixture</h1><p>Controlled preparation failure and hold states; no API calls.</p><button onClick={() => { setMode('fail'); setKey((value) => value + 1) }}>Fail next batch</button><button onClick={() => { setMode('normal'); setKey((value) => value + 1) }}>Normal stream</button><button onClick={() => { setMode('hold'); setKey((value) => value + 1) }}>Hold next batch</button><button onClick={() => setMode('normal')}>Allow retry</button><p>{stream.visible.length} visible fixture records</p><StreamFooter {...stream} noun="records" /></section>
}
export default function Fixture() {
  const [module, setModule] = useState('Bookings')
  const [detail, setDetail] = useState(null)
  const [readOnly, setReadOnly] = useState(false)
  const [collapsed, setCollapsed] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = (value) => { setModule(value); setDetail(null) }
  const view = (id) => { setDetail(id); document.querySelector('.main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' }) }
  const back = () => { setDetail(null); document.querySelector('.main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' }) }
  return <div className={`app-shell mak-admin ${collapsed ? 'sidebar-collapsed' : ''}`}>
    <AdminSidebar groups={navigation} activePage={module} collapsed={collapsed} mobileOpen={mobileOpen} onToggle={() => setCollapsed((value) => !value)} onCloseMobile={() => setMobileOpen(false)} onNavigate={navigate} user={{name:'Demo Admin',role:'Admin'}} onLogout={() => {}} />
    <div className="workspace"><header className="topbar"><div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}><strong>Isolated browser fixture</strong>{['Bookings','Corporate Trips','Customer','Stream states'].map((name) => <button type="button" key={name} onClick={() => navigate(name)}>{name}</button>)}<label><input type="checkbox" checked={readOnly} onChange={(event) => setReadOnly(event.target.checked)} /> Read-only</label></div></header><main className="main-scroll" tabIndex={-1}><div className="content-wrap"><ReadOnlyScope key={String(readOnly)} enabled={readOnly}>
    {module === 'Bookings' ? <BookingPage bookings={records} setBookings={() => {}} vehicles={vehicles} drivers={[]} customers={individuals} quotes={[]} viewBookingId={detail} onViewBooking={view} onBackBookings={back} invoices={[]} onInvoice={() => {}} /> : module === 'Corporate Trips' ? <CorporateTripsPage trips={records} setTrips={() => {}} companies={companies} setCompanies={() => {}} quotes={[]} vehicles={vehicles} drivers={[]} bookings={[]} viewTripId={detail} onViewTrip={view} onBack={back} invoices={[]} onInvoice={() => {}} /> : module === 'Customer' ? <CustomerPage individuals={individuals} setIndividuals={() => {}} companies={companies} setCompanies={() => {}} quotes={[]} setQuotes={() => {}} bookings={records} trips={records} invoices={[]} viewCustomerKey={detail} onViewCustomer={view} onBack={back} /> : <StreamStates />}
    </ReadOnlyScope></div></main></div>
  </div>
}
createRoot(document.getElementById('root')).render(<Fixture />)
