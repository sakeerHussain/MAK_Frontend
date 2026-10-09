import assert from 'node:assert/strict'
import { downloadInvoiceDocument } from '../src/features/invoices/InvoiceExport.js'

let clicked = false
let removed = false
let requested
const anchor = { click: () => { clicked = true }, remove: () => { removed = true } }
globalThis.document = { createElement: () => anchor, body: { appendChild: () => {} } }
globalThis.fetch = async (url) => {
  requested = url
  return { ok: true, headers: new Headers({ 'Content-Type': 'application/pdf' }), blob: async () => new Blob(['%PDF-1.7'], { type: 'application/pdf' }) }
}
await downloadInvoiceDocument({ id: 12, invoiceNumber: 'INV-1012' })
assert.equal(requested, '/api/invoices/12/pdf')
assert.equal(anchor.download, 'INV-1012.pdf')
assert.equal(clicked, true)
assert.equal(removed, true)
globalThis.fetch = async () => ({ ok: false, status: 404, json: async () => ({ detail: 'Invoice not found.' }) })
await assert.rejects(() => downloadInvoiceDocument({ id: 999 }), /Invoice not found/)
globalThis.fetch = async () => ({ ok: true, headers: new Headers({ 'Content-Type': 'text/html' }) })
await assert.rejects(() => downloadInvoiceDocument({ id: 12 }), /did not return a PDF/)
console.log('Direct PDF download tests passed')
