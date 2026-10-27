import { IconCar, IconSteeringWheel, IconUsers, IconClipboardCheck, IconBriefcase, IconFileInvoice, IconWallet, IconUser, IconBuilding, IconTool, IconShieldCheck } from '@tabler/icons-react'

const icons = { fleet: IconCar, drivers: IconSteeringWheel, customers: IconUsers, bookings: IconClipboardCheck, 'corporate-trips': IconBriefcase, invoices: IconFileInvoice, payroll: IconWallet, employees: IconUser, vendors: IconBuilding, maintenance: IconTool, inspections: IconClipboardCheck }

export const roleModuleIcon = module => icons[module] || IconShieldCheck
