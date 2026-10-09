import assert from 'node:assert/strict'
import { listNotifications, notificationSummary, notificationStreamUrl, acknowledgeNotification, readNotification, readAllNotifications } from '../src/features/notifications/NotificationApi.js'
import { setCsrfToken } from '../src/shared/lib/sessionFetch.js'
const calls=[]
globalThis.fetch=async (url,options)=>{calls.push({url,options});return {ok:true,status:200,json:async()=>({items:[],unread:2})}}
assert.equal(notificationStreamUrl,'/api/notifications/stream')
await listNotifications({filter:'Unresolved',priority:'Action required',kind:'Corporate',page:1,from:'2026-10-01',to:''})
const query=new URL(calls.at(-1).url,'http://localhost').searchParams
assert.equal(query.get('priority'),'Action required');assert.equal(query.get('kind'),'Corporate');assert.equal(query.has('to'),false)
assert.equal(calls.at(-1).options.credentials,'include')
setCsrfToken({headerName:'X-CSRF-TOKEN',token:'test-security-token'})
for(const operation of [acknowledgeNotification,readNotification,readAllNotifications]){await operation(12);assert.equal(calls.at(-1).options.method,'POST');assert.equal(calls.at(-1).options.headers['X-CSRF-TOKEN'],'test-security-token')}
assert.equal(calls.at(-1).url,'/api/notifications/read-all')
await notificationSummary();assert.equal(calls.at(-1).url,'/api/notifications/summary')
globalThis.fetch=async()=>({ok:false,status:500,json:async()=>({detail:'Notification delivery unavailable'})})
await assert.rejects(listNotifications(),/Notification delivery unavailable/)
console.log('Notification API filtering, authentication and CSRF tests passed')
