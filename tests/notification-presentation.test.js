import test from 'node:test'
import assert from 'node:assert/strict'
import { notificationPresentation } from '../src/features/notifications/NotificationPresentation.js'

test('cancellation and reschedule notices never offer acknowledgement, including legacy cached severity', () => {
  for (const type of ['Cancelled','Rescheduled']) {
    assert.deepEqual(notificationPresentation({type,actionable:false,priority:'Action required',acknowledgedBy:['Previous reader']}),{priority:'Information',label:'Information',critical:false,canAcknowledge:false,showAcknowledgement:false})
  }
})
test('unresolved actions can be acknowledged without claiming the condition is resolved', () => {
  const action={actionable:true,priority:'Critical'}
  assert.deepEqual(notificationPresentation(action),{priority:'Critical',label:'Critical',critical:true,canAcknowledge:true,showAcknowledgement:false})
  assert.deepEqual(notificationPresentation({...action,acknowledgedAt:'2026-10-27T00:00:00Z'}),{priority:'Critical',label:'Critical',critical:true,canAcknowledge:false,showAcknowledgement:true})
})
test('resolved alerts lose critical presentation and cannot be acknowledged again', () => {
  assert.deepEqual(notificationPresentation({actionable:true,priority:'Critical',resolvedAt:'2026-10-27T00:00:00Z',acknowledgedBy:['Reviewer']}),{priority:'Critical',label:'Resolved',critical:false,canAcknowledge:false,showAcknowledgement:false})
})
