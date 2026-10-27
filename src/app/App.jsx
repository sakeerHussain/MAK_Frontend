import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { navigation, pageSlug } from './navigation.js'
import Icon from './AdminIcon.jsx'
import AdminSidebar from './AdminSidebar.jsx'
import './AdminShell.css'
import './AdminButtons.css'
import './AdminKpis.css'
import AdminPageHeader from './AdminPageHeader.jsx'
import { getAdminPageHeader } from './pageHeaders.js'
import BookingNotifications from '../features/notifications/BookingNotifications.jsx'
const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage.jsx'))
import FleetPage from '../features/fleet/FleetPage.jsx'
import { listVehicles as listVehiclesApi } from '../features/fleet/FleetApi.js'
import DriverPage from '../features/drivers/DriverPage.jsx'
import { listDrivers as listDriversApi } from '../features/drivers/DriverApi.js'
import EmployeePage from '../features/employees/EmployeePage.jsx'
import { listEmployees as listEmployeesApi } from '../features/employees/EmployeeApi.js'
import { listMaintenanceJobs as listMaintenanceJobsApi } from '../features/maintenance/MaintenanceApi.js'
import VendorPage from '../features/vendors/VendorPage.jsx'
import { listVendors as listVendorsApi } from '../features/vendors/VendorApi.js'
import MaintenancePage from '../features/maintenance/MaintenancePage.jsx'
import StaffUsersPage from '../features/auth/StaffUsersPage.jsx'
import SettingsPage from '../features/auth/SettingsPage.jsx'
import SecurityAuditPage from '../features/auth/SecurityAuditPage.jsx'
import ReadOnlyScope from '../features/auth/ReadOnlyScope.jsx'
import { canReadPage, canWritePage, PAGE_MODULE } from '../features/auth/permissions.js'
import InspectionPage from '../features/inspections/InspectionPage.jsx'
import { listInspections as listInspectionsApi } from '../features/inspections/InspectionApi.js'
import BookingPage from '../features/bookings/BookingPage.jsx'
import { listBookings as listBookingsApi } from '../features/bookings/BookingApi.js'
import CorporateTripsPage from '../features/corporate-trips/CorporateTripsPage.jsx'
import { listCorporateTrips as listCorporateTripsApi } from '../features/corporate-trips/CorporateTripApi.js'
import CustomerPage from '../features/customers/CustomerPage.jsx'
import { listCustomers as listCustomersApi, listQuotes as listQuotesApi } from '../features/customers/CustomerApi.js'
import InvoicePage from '../features/invoices/InvoicePage.jsx'
import BillingsPage from '../features/invoices/BillingsPage.jsx'
import PayrollPage from '../features/payroll/PayrollPage.jsx'
import { listInvoices as listInvoicesApi } from '../features/invoices/InvoiceApi.js'

function readRoute() {
  const parts = window.location.hash.replace(/^#\/?/, '').split('/')
  const page = navigation.flatMap((group) => group.items).find((item) => pageSlug(item.name) === parts[0])?.name || 'Dashboard'
  const invoice = page === 'Invoices' ? parts[1] === 'new' ? { mode: 'new', id: null, seedKind: parts[2] === 'corporate' ? 'Corporate' : parts[2] === 'individual' ? 'Individual' : null, seedIds: (parts[3] || '').split(',').map(Number).filter(Boolean) } : parts[1] && Number(parts[1]) ? { mode: parts[2] === 'edit' ? 'edit' : 'detail', id: Number(parts[1]), seedKind: null, seedIds: [] } : { mode: 'list', id: null, seedKind: null, seedIds: [] } : { mode: 'list', id: null, seedKind: null, seedIds: [] }
  return { page, vehicleId: page === 'Fleet' && parts[1] ? Number(parts[1]) || null : null, driverId: page === 'Driver' && parts[1] ? Number(parts[1]) || null : null, employeeId: page === 'Employee' && parts[1] ? Number(parts[1]) || null : null, vendorId: page === 'Vendor' && parts[1] ? Number(parts[1]) || null : null, bookingId: page === 'Bookings' && parts[1] ? Number(parts[1]) || null : null, corporateTripId: page === 'Corporate Trips' && parts[1] ? Number(parts[1]) || null : null, customerKey: page === 'Customer' && parts[1] ? decodeURIComponent(parts[1]) : null, invoice }
}

function EmptySection({ name, onNavigate }) {
  const item = navigation.flatMap((group) => group.items).find((entry) => entry.name === name)
  return <div className="section-placeholder"><div className="placeholder-icon"><Icon name={item?.icon || 'dashboard'} size={32} /></div><h2>Section not configured</h2><p>This section is ready for the page details and workflow you provide next.</p><button type="button" className="primary-button" onClick={() => onNavigate('Dashboard')}><Icon name="dashboard" size={17} /> Back to dashboard</button></div>
}

function App({ user, onLogout }) {
 const loaders = useMemo(() => {
  const permissions = new Set(user.permissions)
  const allowed = (module, load) => () => permissions.has(`${module}.read`) ? load() : Promise.resolve([])
  return {
   listVehicles: allowed('fleet', listVehiclesApi),
   listDrivers: allowed('drivers', listDriversApi),
   listEmployees: allowed('employees', listEmployeesApi),
   listMaintenanceJobs: allowed('maintenance', listMaintenanceJobsApi),
   listInspections: allowed('inspections', listInspectionsApi),
   listVendors: allowed('vendors', listVendorsApi),
   listBookings: allowed('bookings', listBookingsApi),
   listCorporateTrips: allowed('corporate-trips', listCorporateTripsApi),
   listCustomers: allowed('customers', listCustomersApi),
   listQuotes: allowed('customers', listQuotesApi),
   listInvoices: allowed('invoices', listInvoicesApi),
  }
 }, [user.permissions])
 const { listVehicles, listDrivers, listEmployees, listMaintenanceJobs, listInspections, listVendors, listBookings, listCorporateTrips, listCustomers, listQuotes, listInvoices } = loaders
 const [logoutError, setLogoutError] = useState('')
 const signOut = async () => { try { await onLogout() } catch (error) { setLogoutError(error.message) } }

  const [vehicles, setVehicles] = useState([])
  const [fleetLoading, setFleetLoading] = useState(true)
  const [fleetError, setFleetError] = useState('')
  const [drivers, setDrivers] = useState([])
  const [driverLoading, setDriverLoading] = useState(true)
  const [driverLoadError, setDriverLoadError] = useState('')
  const [employees, setEmployees] = useState([])
  const [vendors, setVendors] = useState([])
  const [vendorLoading, setVendorLoading] = useState(true)
  const [vendorLoadError, setVendorLoadError] = useState('')
  const [employeeLoading, setEmployeeLoading] = useState(true)
  const [employeeError, setEmployeeError] = useState('')
  const [maintenanceLoading, setMaintenanceLoading] = useState(true)
  const [maintenanceError, setMaintenanceError] = useState('')
  const [maintenanceJobs, setMaintenanceJobs] = useState([])
  const [inspections, setInspections] = useState([])
  const [inspectionLoading, setInspectionLoading] = useState(true)
  const [inspectionError, setInspectionError] = useState('')
  const [bookingRecords, setBookingRecords] = useState([])
  const [corporateTrips, setCorporateTrips] = useState([])
  const [billingError, setBillingError] = useState('')
  const [billingLoading, setBillingLoading] = useState(true)
  const [companies, setCompanies] = useState([])
  const [individualCustomers, setIndividualCustomers] = useState([])
  const [customerLoading, setCustomerLoading] = useState(true)
  const [customerError, setCustomerError] = useState('')
  const [customerQuotes, setCustomerQuotes] = useState([])
  const [invoiceRecords, setInvoiceRecords] = useState([])
  const [activePage, setActivePage] = useState(() => readRoute().page)
  const [viewVehicleId, setViewVehicleId] = useState(() => readRoute().vehicleId)
  const [viewDriverId, setViewDriverId] = useState(() => readRoute().driverId)
  const [viewEmployeeId, setViewEmployeeId] = useState(() => readRoute().employeeId)
  const [viewVendorId, setViewVendorId] = useState(() => readRoute().vendorId)
  const [viewBookingId, setViewBookingId] = useState(() => readRoute().bookingId)
  const [viewCorporateTripId, setViewCorporateTripId] = useState(() => readRoute().corporateTripId)
  const [viewCustomerKey, setViewCustomerKey] = useState(() => readRoute().customerKey)
  const [invoiceRoute, setInvoiceRoute] = useState(() => readRoute().invoice)
  const [collapsed, setCollapsed] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const closeMobileNavigation = useCallback(() => setMobileOpen(false), [])
  const [bookingCreateKind, setBookingCreateKind] = useState(null)
  const clearBookingCreateKind = useCallback(() => setBookingCreateKind(null), [])
  const [search, setSearch] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const [noticeVisible, setNoticeVisible] = useState(true)
  useEffect(() => {
    let active = true
    listEmployees().then((records) => { if (active) { setEmployees(records); setEmployeeError('') } })
      .catch((error) => { if (active) setEmployeeError(error.message) })
      .finally(() => { if (active) setEmployeeLoading(false) })
    return () => { active = false }
  }, [listEmployees])
  useEffect(() => {
    let active = true
    listMaintenanceJobs().then((records) => { if (active) { setMaintenanceJobs(records); setMaintenanceError('') } })
      .catch((error) => { if (active) setMaintenanceError(error.message) })
      .finally(() => { if (active) setMaintenanceLoading(false) })
    return () => { active = false }
  }, [listMaintenanceJobs])
  useEffect(() => {
    let active = true
    listInspections().then((records) => { if (active) { setInspections(records); setInspectionError('') } })
      .catch((error) => { if (active) setInspectionError(error.message) })
      .finally(() => { if (active) setInspectionLoading(false) })
    return () => { active = false }
  }, [listInspections])
  const reloadInspections = async () => {
    setInspectionLoading(true)
    try { setInspections(await listInspections()); setInspectionError('') }
    catch (error) { setInspectionError(error.message) }
    finally { setInspectionLoading(false) }
  }
  const reloadEmployees = async () => {
    setEmployeeLoading(true)
    try { setEmployees(await listEmployees()); setEmployeeError('') }
    catch (error) { setEmployeeError(error.message) }
    finally { setEmployeeLoading(false) }
  }
  const reloadMaintenance = async () => {
    setMaintenanceLoading(true)
    try {
      const [records, fleet] = await Promise.all([listMaintenanceJobs(), listVehicles()])
      setMaintenanceJobs(records); setVehicles(fleet); setMaintenanceError(''); setFleetError('')
    } catch (error) { setMaintenanceError(error.message) }
    finally { setMaintenanceLoading(false) }
  }

  useEffect(() => {
    let active = true
    Promise.all([listBookings(), listCorporateTrips(), listInvoices()])
      .then(([bookings, trips, invoices]) => {
        if (!active) return
        setBookingRecords(bookings); setCorporateTrips(trips); setInvoiceRecords(invoices); setBillingError('')
      })
      .catch((error) => { if (active) setBillingError(error.message) })
      .finally(() => { if (active) setBillingLoading(false) })
    return () => { active = false }
  }, [listBookings, listCorporateTrips, listInvoices])
  const reloadBilling = async () => {
    setBillingLoading(true)
    try {
      const [bookings, trips, invoices] = await Promise.all([listBookings(), listCorporateTrips(), listInvoices()])
      setBookingRecords(bookings); setCorporateTrips(trips); setInvoiceRecords(invoices); setBillingError('')
    } catch (error) { setBillingError(error.message) }
    finally { setBillingLoading(false) }
  }
  const refreshRentalResources = async () => {
    try {
      const [fleet, personnel] = await Promise.all([listVehicles(), listDrivers()])
      setVehicles(fleet); setDrivers(personnel)
    } catch (error) { setFleetError(error.message); setDriverLoadError(error.message) }
  }
  useEffect(() => {
    let active = true
    listDrivers().then((records) => { if (active) { setDrivers(records); setDriverLoadError('') } })
      .catch((error) => { if (active) setDriverLoadError(error.message) })
      .finally(() => { if (active) setDriverLoading(false) })
    return () => { active = false }
  }, [listDrivers])
  useEffect(() => {
    let active = true
    Promise.all([listCustomers(), listQuotes()]).then(([records, quotes]) => {
      if (!active) return
      setIndividualCustomers(records.filter((record) => record.type === 'Individual'))
      setCompanies(records.filter((record) => record.type === 'Corporate'))
      setCustomerQuotes(quotes); setCustomerError('')
    }).catch((error) => { if (active) setCustomerError(error.message) })
      .finally(() => { if (active) setCustomerLoading(false) })
    return () => { active = false }
  }, [listCustomers, listQuotes])
  const reloadCustomers = async () => {
    setCustomerLoading(true)
    try {
      const [records, quotes] = await Promise.all([listCustomers(), listQuotes()])
      setIndividualCustomers(records.filter((record) => record.type === 'Individual'))
      setCompanies(records.filter((record) => record.type === 'Corporate'))
      setCustomerQuotes(quotes); setCustomerError('')
    } catch (error) { setCustomerError(error.message) }
    finally { setCustomerLoading(false) }
  }
  const reloadDrivers = async () => {
    const records = await listDrivers()
    setDrivers(records)
    setDriverLoadError('')
  }
  useEffect(() => {
    let active = true
    listVendors().then((records) => { if (active) { setVendors(records); setVendorLoadError('') } })
      .catch((error) => { if (active) setVendorLoadError(error.message) })
      .finally(() => { if (active) setVendorLoading(false) })
    return () => { active = false }
  }, [listVendors])
  const reloadVendors = async () => {
    setVendorLoading(true)
    try { setVendors(await listVendors()); setVendorLoadError('') }
    catch (error) { setVendorLoadError(error.message) }
    finally { setVendorLoading(false) }
  }
  useEffect(() => {
    let active = true
    listVehicles().then((records) => { if (active) { setVehicles(records); setFleetError('') } })
      .catch((error) => { if (active) setFleetError(error.message) })
      .finally(() => { if (active) setFleetLoading(false) })
    return () => { active = false }
  }, [listVehicles])
  const reloadFleet = async () => {
    const records = await listVehicles()
    setVehicles(records)
    setFleetError('')
  }
  useEffect(() => {
    const syncRoute = () => { setBookingCreateKind(null); const route = readRoute(); setActivePage(route.page); setViewVehicleId(route.vehicleId); setViewDriverId(route.driverId); setViewEmployeeId(route.employeeId); setViewVendorId(route.vendorId); setViewBookingId(route.bookingId); setViewCorporateTripId(route.corporateTripId); setViewCustomerKey(route.customerKey); setInvoiceRoute(route.invoice) }
    window.addEventListener('popstate', syncRoute)
    window.addEventListener('hashchange', syncRoute)
    return () => { window.removeEventListener('popstate', syncRoute); window.removeEventListener('hashchange', syncRoute) }
  }, [])
  const navigate = (page) => {
    setBookingCreateKind(null)
    setActivePage(page)
    setViewVehicleId(null)
    setViewDriverId(null)
    setViewEmployeeId(null)
    setViewVendorId(null)
    setViewBookingId(null)
    setViewCorporateTripId(null)
    setViewCustomerKey(null)
    setInvoiceRoute({ mode: 'list', id: null, seedKind: null, seedIds: [] })
    window.history.pushState(null, '', `#/${pageSlug(page)}`)
    setMobileOpen(false)
    setSearch('')
    setProfileOpen(false)
    
    document.querySelector('.main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const startBooking = (kind) => { navigate('Bookings'); setBookingCreateKind(kind) }
  const viewVehicle = (id) => {
    setActivePage('Fleet')
    setViewVehicleId(id)
    window.history.pushState(null, '', `#/fleet/${id}`)
    document.querySelector('.main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const backToFleet = () => {
    setViewVehicleId(null)
    window.history.pushState(null, '', '#/fleet')
    document.querySelector('.main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const viewDriver = (id) => {
    setActivePage('Driver')
    setViewDriverId(id)
    window.history.pushState(null, '', `#/driver/${id}`)
    document.querySelector('.main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const backToDrivers = () => {
    setViewDriverId(null)
    window.history.pushState(null, '', '#/driver')
    document.querySelector('.main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const viewEmployee = (id) => {
    setActivePage('Employee')
    setViewEmployeeId(id)
    window.history.pushState(null, '', `#/employee/${id}`)
    document.querySelector('.main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const backToEmployees = () => {
    setViewEmployeeId(null)
    window.history.pushState(null, '', '#/employee')
    document.querySelector('.main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const viewVendor = (id) => {
    setActivePage('Vendor')
    setViewVendorId(id)
    window.history.pushState(null, '', `#/vendor/${id}`)
    document.querySelector('.main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const backToVendors = () => {
    setViewVendorId(null)
    window.history.pushState(null, '', '#/vendor')
    document.querySelector('.main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const viewBooking = (id) => {
    setActivePage('Bookings')
    setViewBookingId(id)
    window.history.pushState(null, '', `#/bookings/${id}`)
    document.querySelector('.main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const backToBookings = () => {
    setViewBookingId(null)
    window.history.pushState(null, '', '#/bookings')
    document.querySelector('.main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const viewCorporateTrip = (id) => {
    setActivePage('Corporate Trips')
    setViewCorporateTripId(id)
    window.history.pushState(null, '', `#/corporate-trips/${id}`)
    document.querySelector('.main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const backToCorporateTrips = () => {
    setViewCorporateTripId(null)
    window.history.pushState(null, '', '#/corporate-trips')
    document.querySelector('.main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const viewCustomer = (key) => { setActivePage('Customer'); setViewCustomerKey(key); window.history.pushState(null, '', `#/customer/${encodeURIComponent(key)}`); document.querySelector('.main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' }) }
  const backToCustomers = () => { setActivePage('Customer'); setViewCustomerKey(null); window.history.pushState(null, '', '#/customer'); document.querySelector('.main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' }) }
  const openInvoice = (id) => { setActivePage('Invoices'); setInvoiceRoute({ mode: 'detail', id, seedKind: null, seedIds: [] }); window.history.pushState(null, '', `#/invoices/${id}`); document.querySelector('.main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' }) }
  const editInvoice = (id) => { setActivePage('Invoices'); setInvoiceRoute({ mode: 'edit', id, seedKind: null, seedIds: [] }); window.history.pushState(null, '', `#/invoices/${id}/edit`); document.querySelector('.main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' }) }
  const backToInvoices = () => { setActivePage('Invoices'); setInvoiceRoute({ mode: 'list', id: null, seedKind: null, seedIds: [] }); window.history.pushState(null, '', '#/invoices'); document.querySelector('.main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' }) }
  const createInvoice = (kind, ids) => { setActivePage('Invoices'); setInvoiceRoute({ mode: 'new', id: null, seedKind: kind, seedIds: ids }); window.history.pushState(null, '', `#/invoices/new/${kind.toLowerCase()}/${ids.join(',')}`); document.querySelector('.main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' }) }
  const invoiceForSource = (kind, id) => invoiceRecords.find((invoice) => invoice.status !== 'Voided' && invoice.sources.some((source) => source.kind === kind && source.id === id))
  const openSourceInvoice = (kind, id) => { const linked = invoiceForSource(kind, id); if (linked) openInvoice(linked.id); else createInvoice(kind, [id]) }
  const openInvoiceSource = (source) => { if (source.kind === 'Individual') viewBooking(source.id); else viewCorporateTrip(source.id) }

  const visibleGroups = navigation.map((group) => ({ ...group, items: group.items.filter((item) => canReadPage(user, item.name) && item.name.toLowerCase().includes(search.trim().toLowerCase())) })).filter((group) => group.items.length)
  const toggleSidebar = () => { if (window.innerWidth < 960) setMobileOpen((open) => !open); else setCollapsed((value) => !value) }
  const detailRequested = Boolean({
    Fleet: viewVehicleId,
    Driver: viewDriverId,
    Employee: viewEmployeeId,
    Vendor: viewVendorId,
    Bookings: viewBookingId,
    'Corporate Trips': viewCorporateTripId,
    Customer: viewCustomerKey,
  }[activePage])
  const pageHeader = getAdminPageHeader(activePage, { detail: detailRequested, invoiceMode: invoiceRoute.mode })

  return (
    <div className={`app-shell mak-admin ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <a className="mak-skip-link" href="#mak-admin-content" onClick={(event) => { event.preventDefault(); document.getElementById('mak-admin-content')?.focus() }}>Skip to main content</a>
      {mobileOpen && <button className="mobile-scrim" type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <AdminSidebar groups={visibleGroups} activePage={activePage} collapsed={collapsed} mobileOpen={mobileOpen}
        onToggle={toggleSidebar} onCloseMobile={closeMobileNavigation} onNavigate={navigate} user={user} onLogout={signOut} />

      <div className="workspace">
        <header className="topbar"><div className="topbar-left"><button className="icon-button menu-button" type="button" aria-label="Toggle navigation" aria-expanded={mobileOpen} onClick={toggleSidebar}><Icon name="menu" size={21} /></button><label className="global-search"><Icon name="search" size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && visibleGroups[0]?.items[0]) navigate(visibleGroups[0].items[0].name); if (event.key === 'Escape') setSearch('') }} type="search" placeholder="Search pages..." aria-label="Search sidebar pages" /><kbd aria-label="Press Enter"><Icon name="enter" size={14} /></kbd></label></div><div className="topbar-right"><div className="mak-header-date"><strong>{new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Riyadh' }).format(new Date())}</strong><span>Saudi Arabia time</span></div><BookingNotifications user={user} onOpen={() => setProfileOpen(false)} onOpenBooking={(kind, id) => { reloadBilling(); kind === "Corporate" ? viewCorporateTrip(id) : viewBooking(id) }} /><div className="topbar-divider" /><div className="topbar-popover-anchor"><button className="profile-button" type="button" aria-label="Open profile menu" aria-expanded={profileOpen} onClick={() => { setProfileOpen((open) => !open);  }}><span className="profile-avatar">{user.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span><span className="profile-details"><strong>{user.name}</strong><small>{user.role}</small></span><Icon name="chevron" size={16} /></button>{profileOpen && <div className="popover profile-popover"><strong>{user.name}</strong><p>{user.email}</p>{canReadPage(user, 'Settings') && <button type="button" onClick={() => navigate('Settings')}><Icon name="settings" size={16} /> Settings</button>}{canReadPage(user, 'Staff & Users') && <button type="button" onClick={() => navigate('Staff & Users')}><Icon name="users" size={16} /> Staff & Users</button>}<button type="button" onClick={signOut}><Icon name="power" size={16} /> Sign Out</button></div>}</div></div></header>

        <main className="main-scroll" id="mak-admin-content" tabIndex={-1}><div className={`content-wrap ${activePage === 'Customer' ? 'customer-content-wrap' : ''}`}>
          {activePage !== 'Dashboard' && !(canReadPage(user, activePage) && (['Fleet', 'Driver', 'Employee', 'Vendor', 'Maintenance', 'Inspections'].includes(activePage) || (['Bookings', 'Corporate Trips', 'Billings'].includes(activePage) && !billingLoading && !billingError) || ['Payroll', 'Staff & Users', 'Audit Log', 'Settings'].includes(activePage) || (activePage === 'Invoices' && invoiceRoute.mode === 'list' && !billingLoading && !billingError)) && !detailRequested) && <AdminPageHeader {...pageHeader} />}
          {logoutError && <p role="alert" className="access-error">{logoutError}</p>}
          <ReadOnlyScope user={user} module={PAGE_MODULE[activePage]} enabled={canReadPage(user, activePage) && !['Dashboard', 'Audit Log', 'Settings'].includes(activePage) && !canWritePage(user, activePage)}>
          {!canReadPage(user, activePage) ? <section className="access-denied"><h2>Access restricted</h2><p>Your role does not have access to this page. Contact an administrator if you need access.</p><button className="primary-button" onClick={() => navigate('Dashboard')}>Back to dashboard</button></section> : activePage === 'Staff & Users' ? <StaffUsersPage /> : activePage === 'Audit Log' ? <SecurityAuditPage /> : activePage === 'Settings' ? <SettingsPage onNavigate={navigate} pages={['Staff & Users', 'Audit Log', 'Settings'].filter((page) => canReadPage(user, page))} /> : ['Bookings', 'Corporate Trips', 'Invoices', 'Billings'].includes(activePage) && (billingLoading || billingError) ? <section className="invoice-card" aria-live="polite"><h2>{billingLoading ? 'Loading records…' : 'Unable to load records'}</h2>{billingError && <p className="booking-error" role="alert">{billingError}</p>}{!billingLoading && <button type="button" className="booking-primary" onClick={reloadBilling}>Retry</button>}</section> : activePage === 'Dashboard' ? <Suspense fallback={<section className="invoice-card" role="status">Loading dashboard charts...</section>}><DashboardPage bookingPage={canReadPage(user, 'Bookings') ? 'Bookings' : 'Corporate Trips'} invoices={invoiceRecords} invoicesLoading={billingLoading} invoicesError={billingError} onRetryInvoices={reloadBilling} bookings={bookingRecords} trips={corporateTrips} vehicles={vehicles} onOpenInvoice={openInvoice} onNewBooking={canWritePage(user, 'Bookings') ? startBooking : undefined} onOpenAlert={(page, id) => page === 'Fleet' ? viewVehicle(id) : page === 'Driver' ? viewDriver(id) : navigate(page)} onOpenBooking={(kind, id) => kind === 'Corporate' ? viewCorporateTrip(id) : viewBooking(id)} onNavigate={navigate} noticeVisible={noticeVisible} onDismissNotice={() => setNoticeVisible(false)} /></Suspense> : activePage === 'Fleet' ? <FleetPage vehicles={vehicles} setVehicles={setVehicles} vendors={vendors} loading={fleetLoading} loadError={fleetError} onReload={reloadFleet} viewVehicleId={viewVehicleId} onViewVehicle={viewVehicle} onBackFleet={backToFleet} /> : activePage === 'Driver' ? <DriverPage drivers={drivers} setDrivers={setDrivers} loading={driverLoading} loadError={driverLoadError} onReload={reloadDrivers} viewDriverId={viewDriverId} onViewDriver={viewDriver} onBackDrivers={backToDrivers} /> : activePage === 'Employee' ? <EmployeePage loading={employeeLoading} loadError={employeeError} onReload={reloadEmployees} employees={employees} setEmployees={setEmployees} viewEmployeeId={viewEmployeeId} onViewEmployee={viewEmployee} onBackEmployees={backToEmployees} /> : activePage === 'Vendor' ? <VendorPage vendors={vendors} setVendors={setVendors} vehicles={vehicles} drivers={drivers} employees={employees} loading={vendorLoading} loadError={vendorLoadError} onReload={reloadVendors} viewVendorId={viewVendorId} onViewVendor={viewVendor} onBackVendor={backToVendors} /> : activePage === 'Maintenance' ? <MaintenancePage loading={maintenanceLoading || fleetLoading} loadError={maintenanceError || fleetError} onReload={reloadMaintenance} jobs={maintenanceJobs} setJobs={setMaintenanceJobs} vehicles={vehicles} setVehicles={setVehicles} bookings={bookingRecords} trips={corporateTrips} onViewVehicle={viewVehicle} /> : activePage === 'Inspections' ? <InspectionPage inspections={inspections} setInspections={setInspections} vehicles={vehicles} setVehicles={setVehicles} loading={inspectionLoading || fleetLoading || billingLoading} loadError={inspectionError || fleetError || billingError} onReload={() => Promise.all([reloadInspections(), reloadFleet(), reloadBilling()])} bookings={[...bookingRecords, ...corporateTrips.map((trip) => ({ ...trip, bookingId: trip.tripId, customerName: trip.companyName }))]} onViewVehicle={viewVehicle} onViewBooking={(id) => corporateTrips.some((trip) => trip.id === id) ? viewCorporateTrip(id) : viewBooking(id)} /> : activePage === 'Bookings' ? <BookingPage initialDialog={bookingCreateKind} onInitialDialogOpened={clearBookingCreateKind} bookings={bookingRecords} setBookings={setBookingRecords} vehicles={vehicles} drivers={drivers} customers={individualCustomers} quotes={customerQuotes} viewBookingId={viewBookingId} onViewBooking={viewBooking} onBackBookings={backToBookings} onResourcesChanged={refreshRentalResources} invoices={invoiceRecords} onInvoice={(booking) => openSourceInvoice('Individual', booking.id)} /> : activePage === 'Corporate Trips' ? <CorporateTripsPage trips={corporateTrips} setTrips={setCorporateTrips} companies={companies} setCompanies={setCompanies} quotes={customerQuotes} vehicles={vehicles} drivers={drivers} bookings={bookingRecords} viewTripId={viewCorporateTripId} onViewTrip={viewCorporateTrip} onBack={backToCorporateTrips} onResourcesChanged={refreshRentalResources} invoices={invoiceRecords} onInvoice={(trip) => openSourceInvoice('Corporate', trip.id)} /> : activePage === 'Customer' ? <CustomerPage loading={customerLoading} loadError={customerError} onReload={reloadCustomers} individuals={individualCustomers} setIndividuals={setIndividualCustomers} companies={companies} setCompanies={setCompanies} quotes={customerQuotes} setQuotes={setCustomerQuotes} bookings={bookingRecords} trips={corporateTrips} invoices={invoiceRecords} viewCustomerKey={viewCustomerKey} onViewCustomer={viewCustomer} onBack={backToCustomers} onViewBooking={viewBooking} onViewTrip={viewCorporateTrip} onViewInvoice={openInvoice} /> : activePage === 'Payroll' ? <PayrollPage user={user} /> : activePage === 'Invoices' ? <InvoicePage route={invoiceRoute} invoices={invoiceRecords} setInvoices={setInvoiceRecords} bookings={bookingRecords} setBookings={setBookingRecords} trips={corporateTrips} setTrips={setCorporateTrips} companies={companies} onOpen={openInvoice} onEdit={editInvoice} onBack={backToInvoices} onBillings={() => navigate('Billings')} onOpenSource={openInvoiceSource} /> : activePage === 'Billings' ? <BillingsPage canEditProfiles={canWritePage(user, 'Customer')} loading={billingLoading || customerLoading} loadError={billingError || customerError} onReload={() => Promise.all([reloadBilling(), reloadCustomers()])} bookings={bookingRecords} trips={corporateTrips} companies={companies} setCompanies={setCompanies} invoices={invoiceRecords} onCreate={createInvoice} onInvoices={backToInvoices} /> : <EmptySection name={activePage} onNavigate={navigate} />}
          </ReadOnlyScope>
          <footer className="footer"><span>© {new Date().getFullYear()} MAK admin</span><span>Rental operations</span></footer>
        </div></main>
      </div>
    </div>
  )
}

export default App
