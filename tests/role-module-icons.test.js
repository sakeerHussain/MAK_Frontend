import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ROLE_MODULES } from '../src/features/auth/RoleData.js'
import { roleModuleIcon } from '../src/features/auth/RoleModuleIcons.js'

for (const [module, label] of [...ROLE_MODULES, ['future-module', 'Unmapped module']]) {
  assert.match(renderToStaticMarkup(createElement(roleModuleIcon(module), { size: 18 })), /<svg/, `${label} must render a valid icon`)
}
assert.match(renderToStaticMarkup(createElement(roleModuleIcon('payroll'))), /icon-wallet/)
console.log('Users and Roles: every permission module and unknown modules render valid icons.')
