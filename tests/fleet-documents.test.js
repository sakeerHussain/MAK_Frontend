import test from 'node:test'
import assert from 'node:assert/strict'
import { vehicleDocumentKind, vehicleDocumentLinks } from '../src/features/fleet/FleetDocuments.js'

test('PDF MIME prevents treating document URLs or misleading filenames as image previews', () => {
  assert.equal(vehicleDocumentKind({ contentType: 'application/pdf', name: 'scan.jpg', previewUrl: '/api/file' }), 'pdf')
  assert.equal(vehicleDocumentKind({ contentType: 'Application/PDF; charset=binary', name: 'scan' }), 'pdf')
  assert.equal(vehicleDocumentKind({ name: 'Istimara.PDF' }), 'pdf')
  assert.equal(vehicleDocumentKind({ contentType: 'text/html', name: 'scan.jpg' }), 'file')
})

test('supported images retain thumbnails and pending files use their actual type', () => {
  for (const contentType of ['image/png', 'image/jpeg', 'image/webp']) assert.equal(vehicleDocumentKind({ contentType }), 'image')
  assert.equal(vehicleDocumentKind({ name: 'insurance.JPEG' }), 'image')
  assert.equal(vehicleDocumentKind({ name: 'renamed.jpg', file: { type: 'application/pdf' } }), 'pdf')
  assert.equal(vehicleDocumentKind(null), 'file')
})

test('only saved server documents expose separate preview and forced-download URLs', () => {
  const record = { id: 5, name: 'Istimara 2026.pdf', url: '/api/vehicles/2/files/5' }
  assert.deepEqual(vehicleDocumentLinks(record), { open: '/api/vehicles/2/files/5', download: '/api/vehicles/2/files/5?download=true' })
  assert.equal(vehicleDocumentLinks({ name: record.name, previewUrl: 'data:image/png;base64,test' }), null)
  assert.equal(vehicleDocumentLinks({ id: 5 }), null)
  assert.deepEqual(vehicleDocumentLinks({ ...record, url: record.url + '?version=2' }), { open: record.url + '?version=2', download: record.url + '?version=2&download=true' })
})
