import { sessionFetch } from './sessionFetch.js'
const API = (import.meta.env?.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

export async function apiRequest(path, method = 'GET', data) {
  let response
  try {
    response = await sessionFetch(`${API}${path}`, {
      method,
      ...(data === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    })
  } catch { throw new Error('Cannot reach the backend. Start Spring Boot and try again.') }
  if (!response.ok) {
    const problem = await response.json().catch(() => null)
    throw new Error(problem?.detail || `Request failed (${response.status}).`)
  }
  return response.status === 204 ? null : response.json()
}

export async function downloadApiFile(path, filename) {
  let response
  try { response = await sessionFetch(`${API}${path}`) }
  catch { throw new Error('Cannot reach the backend. Start Spring Boot and try again.') }
  if (!response.ok) {
    const problem = await response.json().catch(() => null)
    throw new Error(problem?.detail || `Download failed (${response.status}).`)
  }
  if (!response.headers.get('content-type')?.includes('application/pdf')) throw new Error('The server did not return a PDF.')
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url; anchor.download = filename
  document.body.appendChild(anchor); anchor.click(); anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function apiMultipart(path, method, body) {
  let response
  try { response = await sessionFetch(`${API}${path}`, { method, body }) }
  catch { throw new Error('Cannot reach the backend. Start Spring Boot and try again.') }
  if (!response.ok) {
    const problem = await response.json().catch(() => null)
    throw new Error(problem?.detail || `Request failed (${response.status}).`)
  }
  return response.json()
}
export const apiFileUrl = (url) => url?.replace(/^\/api(?=\/)/, API) || null
