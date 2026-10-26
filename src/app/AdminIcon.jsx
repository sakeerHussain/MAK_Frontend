import {
  IconArrowLeft, IconArrowRight, IconArrowBackUp, IconBell, IconBuilding,
  IconBuildingStore, IconCalendar, IconCalendarEvent, IconCar, IconChartLine,
  IconCheck, IconChevronDown, IconChevronLeft, IconChevronRight,
  IconChevronsLeft, IconChevronsRight, IconClipboardCheck, IconClock,
  IconCreditCard, IconFileInvoice, IconFileText, IconHome, IconLayoutDashboard,
  IconLogout, IconMapPin, IconMenu2, IconPlus, IconReceipt, IconRefresh,
  IconSearch, IconSettings, IconShieldCheck, IconStar, IconTool, IconUser,
  IconUsers, IconWallet, IconX, IconAlertTriangle, IconCircleCheck,
} from '@tabler/icons-react'

const icons = {
  dashboard: IconHome, overview: IconLayoutDashboard, fleet: IconCar,
  driver: IconUser, employee: IconUsers, vendor: IconBuildingStore,
  maintenance: IconTool, inspections: IconClipboardCheck, tracking: IconMapPin,
  bookings: IconCalendarEvent, corporate: IconBuilding, customer: IconUser,
  payroll: IconWallet, invoices: IconFileInvoice, billings: IconCreditCard,
  reviews: IconStar, users: IconUsers, audit: IconShieldCheck,
  settings: IconSettings, enter: IconArrowBackUp, search: IconSearch,
  bell: IconBell, chevron: IconChevronDown, menu: IconMenu2, close: IconX,
  arrow: IconArrowRight, back: IconArrowLeft, trend: IconChartLine,
  clock: IconClock, alert: IconAlertTriangle, check: IconCheck,
  ready: IconCircleCheck, calendar: IconCalendar, plus: IconPlus,
  wallet: IconWallet, reset: IconRefresh, power: IconLogout,
  document: IconFileText, receipt: IconReceipt, next: IconChevronRight,
  previous: IconChevronLeft, collapse: IconChevronsLeft, expand: IconChevronsRight,
}

export default function AdminIcon({ name, size = 20, className = '', ...props }) {
  const Component = icons[name] || IconLayoutDashboard
  return <Component size={size} stroke={1.7} className={className} aria-hidden="true" {...props} />
}
