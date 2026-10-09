const API = (import.meta.env?.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
let csrf = null
let pending = null
export function clearCsrfToken() { csrf = null; pending = null }
export function setCsrfToken(value) { csrf = value }
async function token() {
  if (csrf) return csrf
  if (!pending) pending = fetch(`${API}/auth/csrf`, { credentials: 'include' }).then(async (response) => {
    if (!response.ok) throw new Error('Unable to establish a secure session. Refresh and try again.')
    const value = await response.json()
    if (!value.token || !value.headerName) throw new Error('The backend did not return a security token.')
    csrf = value
    return value
  }).finally(() => { pending = null })
  return pending
}
export async function sessionFetch(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase()
  let headers = options.headers
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const value = await token()
    headers = { ...headers, [value.headerName]: value.token }
  }
  const response = await fetch(url, { ...options, ...(headers ? { headers } : {}), credentials: 'include' })
  let expired = response.status === 401
  if (response.status === 403 && !url.includes('/auth/')) {
    try { const check = await fetch(`${API}/auth/me`, { credentials: 'include' }); if (check.ok) expired = !(await check.json()).user } catch { /* Preserve the original failure. */ }
  }
  if (expired && !url.includes('/auth/')) {
    clearCsrfToken()
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('auth-expired'))
  }
  return response
}
