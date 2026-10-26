import test from 'node:test'
import assert from 'node:assert/strict'
import {changeRolePermission,roleError,roleSignature} from '../src/features/auth/RoleData.js'
import {canWritePage,actionPermissions} from '../src/features/auth/permissions.js'
test('module grants require view and removing view removes dependent actions',()=>{let role={name:'Operations custom',description:'',permissions:['dashboard.read']};role=changeRolePermission(role,'fleet.edit',true);assert.ok(role.permissions.includes('fleet.read'));role=changeRolePermission(role,'fleet.read',false);assert.ok(!role.permissions.includes('fleet.edit'));assert.ok(role.permissions.includes('dashboard.read'))})
test('sensitive actions require invoice or booking read and clear with dependency',()=>{let role={name:'Finance',description:'',permissions:[]};role=changeRolePermission(role,'invoices.credit',true);assert.ok(role.permissions.includes('invoices.read'));assert.ok(!role.permissions.includes('payments.refund'));role=changeRolePermission(role,'billing-profile.write',true);role=changeRolePermission(role,'invoices.read',false);assert.ok(!role.permissions.includes('invoices.credit'));assert.ok(!role.permissions.includes('billing-profile.write'))})
test('custom action grants enable relevant pages while preserving read-only navigation',()=>{assert.equal(canWritePage({permissions:['fleet.read','fleet.create']},'Fleet'),true);assert.equal(canWritePage({permissions:['fleet.read']},'Fleet'),false);assert.equal(canWritePage({permissions:['invoices.read','invoices.issue']},'Invoices'),true);assert.deepEqual(actionPermissions('Review & Issue','invoices'),['invoices.issue']);assert.deepEqual(actionPermissions('Record Refund','invoices'),['payments.refund']);assert.deepEqual(actionPermissions('Save MAK Billing Profile','settings'),['billing-profile.write'])})
test('role validation and dirty checks ignore permission order but retain descriptions',()=>{assert.match(roleError({name:'',description:''}),/role name/);const role={name:'Finance',description:'Billing',permissions:['a','b']};assert.equal(roleSignature(role),roleSignature({...role,permissions:['b','a']}));assert.notEqual(roleSignature(role),roleSignature({...role,description:'New'}))})

test('explicit form permissions preserve create/edit separation and finance actions',async()=>{
 const {allowsPermission,requiredPermission}=await import('../src/features/auth/PermissionRules.js')
 const element=(label,scope,explicit=null,type='button',upload=null)=>({getAttribute:key=>key==='data-permission'?explicit:key==='aria-label'?null:null,textContent:label,matches:()=>type==='file',closest:selector=>selector==='[data-permission-scope]'&&scope?{getAttribute:()=>scope}:selector==='[data-upload-permission]'&&upload?{getAttribute:()=>upload}:null})
 for(const module of ['fleet','drivers','employees','vendors','customers','bookings','corporate-trips','maintenance','inspections','invoices']){
  const required=requiredPermission(element('Save record',`${module}.create`),module,actionPermissions)
  assert.equal(allowsPermission([`${module}.create`],required),true)
  assert.equal(allowsPermission([`${module}.edit`],required),false)
 }
 assert.equal(requiredPermission(element('Save Car','fleet.create'),'fleet',actionPermissions),'fleet.create')
 assert.equal(requiredPermission(element('Save Car','fleet.edit'),'fleet',actionPermissions),'fleet.edit')
 assert.equal(requiredPermission(element('Remove','invoices.create'),'invoices',actionPermissions),'invoices.create')
 assert.equal(requiredPermission(element('Issue Credit Note','invoices.credit'),'invoices',actionPermissions),'invoices.credit')
 assert.equal(requiredPermission(element('Cancel','invoices.credit'),'invoices',actionPermissions),'')
 assert.equal(requiredPermission(element('Save','fleet.create','invoices.issue'),'fleet',actionPermissions),'invoices.issue')
 assert.equal(requiredPermission(element('Upload','fleet.create',null,'file'),'fleet',actionPermissions),'fleet.edit')
 assert.equal(requiredPermission(element('Upload','employees.create',null,'file','employees.create'),'employees',actionPermissions),'employees.create')
 assert.equal(allowsPermission(['invoices.create'],'invoices.create&invoices.issue'),false)
 assert.equal(allowsPermission(['invoices.create','invoices.issue'],'invoices.create&invoices.issue'),true)
 assert.equal(allowsPermission(['payments.refund'],'invoices.edit|payments.refund'),true)
 assert.deepEqual(actionPermissions('Issue Credit Note','invoices'),['invoices.credit'])
})
test('tabs support arrows, wraparound and Home/End',async()=>{
 const {tabDestination,removalLabel}=await import('../src/features/auth/RoleData.js')
 assert.equal(tabDestination('Roles','ArrowLeft'),'Invitations')
 assert.equal(tabDestination('Roles','ArrowRight'),'Members')
 assert.equal(tabDestination('Members','ArrowLeft'),'Roles')
 assert.equal(tabDestination('Invitations','Home'),'Members')
 assert.equal(tabDestination('Members','End'),'Roles')
 assert.equal(tabDestination('Roles','Tab'),null)
 assert.equal(removalLabel('bookings'),undefined)
 assert.equal(removalLabel('invoices'),'Discard invoice drafts')
})

test('employee attachment removal distinguishes saved files, pending files and replacement undo',async()=>{
 const {employeeAttachmentAction}=await import('../src/features/employees/EmployeeAttachments.js')
 const saved={id:17,type:'Contract copy',name:'saved.png'}
 assert.deepEqual(employeeAttachmentAction(saved,saved,true),{permission:'employees.archive',label:'Remove',restore:null})
 const replacement={type:'Contract copy',file:{name:'replacement.png'}}
 assert.deepEqual(employeeAttachmentAction(replacement,saved,true),{permission:'employees.edit',label:'Undo replacement',restore:saved})
 assert.deepEqual(employeeAttachmentAction(replacement,null,true),{permission:'employees.edit',label:'Remove',restore:null})
 assert.deepEqual(employeeAttachmentAction(replacement,null,false),{permission:'employees.create',label:'Remove',restore:null})
 assert.equal(employeeAttachmentAction(saved,null,true).permission,'employees.archive')
})
