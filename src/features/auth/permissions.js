export const PAGE_MODULE = {
  Dashboard: 'dashboard', Fleet: 'fleet', Driver: 'drivers', Employee: 'employees', Vendor: 'vendors', Maintenance: 'maintenance', Inspections: 'inspections',
  Bookings: 'bookings', 'Corporate Trips': 'corporate-trips', Customer: 'customers', Invoices: 'invoices', Billings: 'invoices', Payroll: 'payroll',
  'Staff & Users': 'users', 'Audit Log': 'audit', Settings: 'settings',
}
export function canReadPage(user, page) { const module = PAGE_MODULE[page]; return Boolean(module && user.permissions.includes(module === 'users' ? 'users.manage' : `${module}.read`)) }
export function canWritePage(user, page) { const module = PAGE_MODULE[page]; return Boolean(module && (module === 'users' ? user.permissions.includes('users.manage') : ['write','create','edit','archive'].some(action=>user.permissions.includes(`${module}.${action}`)) || module==='payroll'&&['payroll.approve','payroll.pay','payroll.correct'].some(key=>user.permissions.includes(key)) || module==='invoices'&&['invoices.issue','invoices.credit','payments.refund','billing-profile.write'].some(key=>user.permissions.includes(key)))) }
export function actionPermissions(label,module){
 const text=label.trim().replace(/^\+\s*/,'')
 if(module==='users')return isWriteAction(text)?['users.manage']:[]
 if(module==='payroll'){if(/^(?:review.*approve|approve payroll|confirm approval)/i.test(text))return ['payroll.approve'];if(/^(?:record.*payment|attach.*receipt)/i.test(text))return ['payroll.pay'];if(/^(?:reverse.*payment|reopen.*payroll)/i.test(text))return ['payroll.correct'];if(/^discard draft/i.test(text))return ['payroll.archive']}
 if(/^(?:review & issue|confirm issue|issue invoice)/i.test(text))return ['invoices.issue']
 if(/^(?:create|review|issue) credit note/i.test(text))return ['invoices.credit']
 if(/^record refund/i.test(text))return ['payments.refund']
 if(/^(?:save mak billing profile|edit bank details)/i.test(text))return ['billing-profile.write']
 if(/^(?:manage payments|record payment \/ refund|payments)/i.test(text))return [`${module}.edit`,'payments.refund']
 if(module==='invoices'&&/^add (?:extra charge|line)/i.test(text))return ['invoices.edit']
 if(/^discard draft/i.test(text))return ['invoices.archive']
 if(/^(?:add|new|create|bulk upload|import)/i.test(text))return [`${module}.create`]
 if(/^(?:delete|remove|archive)/i.test(text))return [`${module}.archive`]
 return isWriteAction(text)?[`${module}.edit`]:[]
}
export function isWriteAction(label) {
  return /^(?:\+\s*)?(?:add|new|create|edit|save|discard|delete|remove|upload|import|bulk upload|activate|deactivate|update|assign|reassign|confirm booking|start rental|complete|handover|return vehicle|record|approve|reject|supersede|share|send|email|resend|retry email|payments|cancel booking|cancel trip|issue)\b/i.test(label.trim())
}
