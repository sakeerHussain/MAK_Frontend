export function allowsPermission(permissions, expression) {
  if (!expression) return true
  return expression.split('|').some(choice => choice.split('&').every(permission => permissions.includes(permission.trim())))
}

export function requiredPermission(element, module, fallback) {
  const explicit = element.getAttribute('data-permission')
  if (explicit !== null) return explicit
  if (element.matches('input[type="file"]')) return element.closest('[data-upload-permission]')?.getAttribute('data-upload-permission') || `${module}.edit`
  const scope = element.closest('[data-permission-scope]')?.getAttribute('data-permission-scope')
  const label = element.getAttribute('aria-label') || element.textContent || ''
  if (scope && !/^(?:cancel|close|back|done|download|preview|reload)\b/i.test(label.trim())) return scope
  return fallback(label, module).join('|')
}
