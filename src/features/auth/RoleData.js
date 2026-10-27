export const ROLE_MODULES=[['fleet','Fleet'],['drivers','Drivers'],['customers','Customers'],['bookings','Bookings'],['corporate-trips','Corporate Trips'],['invoices','Invoice drafts'],['payroll','Payroll salaries and drafts'],['employees','Employee profiles'],['vendors','Vendors'],['maintenance','Maintenance'],['inspections','Inspections']]
export const ROLE_ACTIONS=[['read','View'],['create','Create'],['edit','Edit'],['archive','Remove / discard']]
export const SENSITIVE_ACTIONS=[['payroll.approve','Approve payroll','Lock reviewed salary figures for payment.'],['payroll.pay','Record payroll payments','Record bank/cash payments and attach proof.'],['payroll.correct','Correct payroll records','Reverse erroneous payment records or reopen unpaid payroll with a reason.'],['invoices.issue','Issue invoices','Issue final invoices to customers.'],['invoices.credit','Create credit notes','Reduce issued invoice amounts through credit notes.'],['payments.refund','Record refunds','Record customer refunds on bookings or credited invoices.'],['billing-profile.write','Edit bank details','Change the saved MAK seller and payment profile.']]
export const ADMIN_ACTIONS=[['audit.read','Read audit log'],['settings.read','Open Settings'],['users.manage','Manage users and roles']]
export const roleChoice=role=>role.key||role.roleId&&`custom:${role.roleId}`||role.baseRole||role.role
export const copyRole=role=>({...role,permissions:[...role.permissions]})
export const roleSignature=role=>JSON.stringify({name:role.name,description:role.description,permissions:[...role.permissions].sort()})
export function changeRolePermission(role,permission,enabled){
 const set=new Set(role.permissions)
 if(enabled){set.add(permission);const dot=permission.lastIndexOf('.'),module=permission.slice(0,dot);if(ROLE_MODULES.some(([key])=>key===module))set.add(`${module}.read`);if(['invoices.issue','invoices.credit','billing-profile.write'].includes(permission))set.add('invoices.read');if(permission==='payments.refund'&&!set.has('bookings.read')&&!set.has('invoices.read'))set.add('invoices.read')}
 else{set.delete(permission);if(permission.endsWith('.read')){const module=permission.slice(0,-5);for(const action of ['create','edit','archive','write'])set.delete(`${module}.${action}`);if(module==='payroll'){set.delete('payroll.approve');set.delete('payroll.pay');set.delete('payroll.correct')}if(module==='invoices'){set.delete('invoices.issue');set.delete('invoices.credit');set.delete('billing-profile.write')}if(!set.has('bookings.read')&&!set.has('invoices.read'))set.delete('payments.refund')}}
 set.add('dashboard.read');return {...role,permissions:[...set].sort()}
}
export function roleError(role){if(role.name.trim().length<2||role.name.trim().length>80)return 'Enter a role name of 2–80 characters.';if(role.description.length>300)return 'Keep the description within 300 characters.';return ''}
export const ksaDate=value=>value?new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Riyadh'}).format(new Date(value)):'Never'

export const removalLabel=module=>({fleet:'Remove vehicle files',drivers:'Delete drivers or files',employees:'Delete employees or files',vendors:'Delete vendors or files',invoices:'Discard invoice drafts',payroll:'Discard payroll drafts'}[module])
export function tabDestination(current,key){const tabs=['Members','Invitations','Roles'];const index=tabs.indexOf(current);return key==='Home'?tabs[0]:key==='End'?tabs.at(-1):key==='ArrowLeft'?tabs[(index+tabs.length-1)%tabs.length]:key==='ArrowRight'?tabs[(index+1)%tabs.length]:null}
