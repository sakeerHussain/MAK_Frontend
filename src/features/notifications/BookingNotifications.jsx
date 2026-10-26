import { useCallback, useEffect, useRef, useState } from 'react'
import Icon from '../../app/Icon.jsx'
import { acknowledgeNotification, listNotifications, notificationStreamUrl, notificationSummary, readAllNotifications, readNotification } from './NotificationApi.js'
import './Notifications.css'
import { createNotificationSound } from './NotificationSound.js'
const date = value => value ? new Date(value).toLocaleString('en-GB', { timeZone: 'Asia/Riyadh', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) : '—'
function AlertCard({ item, onRead, onAck, onOpen }) {
 const details = item.details || {}
 return <article className={`booking-alert-card ${item.priority === 'Critical' && !item.resolvedAt ? 'critical' : ''} ${!item.readAt ? 'unread' : ''}`}>
  <div className="booking-alert-heading"><span className={`booking-alert-priority ${item.priority === 'Critical' ? 'critical' : ''}`}>{item.resolvedAt ? 'Resolved' : item.priority}</span><time>{date(item.createdAt)}</time></div>
  <strong>{item.title}</strong><p>{details.reference} · {details.customer} <span className="booking-alert-kind">{item.kind}</span></p>
  <div className="booking-alert-facts"><span><Icon name="calendar" size={13}/>Pickup: {date(details.pickupAt + '+03:00')} KSA</span>{details.pickupLocation && <span><Icon name="tracking" size={13}/>{details.pickupLocation}</span>}<span>Vehicle: {details.vehicleAssigned ? 'Assigned' : 'Unassigned'} · Driver: {details.driver}</span>{item.type === 'Overdue return' && <span>Return: {date(details.returnAt + '+03:00')} KSA</span>}</div>
  <div className="booking-alert-actions"><button onClick={() => onOpen(item)}><Icon name="eye" size={14}/>{item.type === 'Assignment' && !item.resolvedAt ? 'View / Assign' : 'View booking'}</button>{!item.acknowledgedAt && !item.resolvedAt && item.priority !== 'Information' && <button onClick={() => onAck(item.id)}><Icon name="check" size={14}/>Acknowledge</button>}{!item.readAt && <button onClick={() => onRead(item.id)}>Mark read</button>}</div>
  {!item.resolvedAt && (item.acknowledgedAt || item.acknowledgedBy?.length > 0) && <small>Acknowledged by {item.acknowledgedAt ? "you" : item.acknowledgedBy.join(", ")} · Booking action still required</small>}
 </article>
}
export default function BookingNotifications({ user, onOpenBooking, onOpen }) {
 const eligible = user.permissions?.some(p => ['bookings.write','bookings.create','bookings.edit','bookings.archive','corporate-trips.write','corporate-trips.create','corporate-trips.edit','corporate-trips.archive'].includes(p))
 const [open,setOpen] = useState(false),[centre,setCentre] = useState(false),[status,setStatus] = useState('Connecting'),[error,setError] = useState('')
 const [summary,setSummary] = useState({unread:0,critical:0,unresolved:0}),[recent,setRecent] = useState([]),[critical,setCritical] = useState([]),[toasts,setToasts] = useState([])
 const [result,setResult] = useState({items:[],total:0}),[loading,setLoading] = useState(false)
 const [filters,setFilters] = useState({filter:'Unresolved',kind:'',priority:'',type:'',from:'',to:'',page:0})
 const [sound,setSound] = useState(() => localStorage.getItem(`notification-sound-${user.id}`) === 'true')
 const [audioMessage,setAudioMessage] = useState('')
 const audio=useRef(null), soundItems=useRef([])
 const soundRef=useRef(sound), active=useRef(false),request=useRef(0),centreRef=useRef(null),bellRef=useRef(null)
 useEffect(()=>{soundRef.current=sound;localStorage.setItem(`notification-sound-${user.id}`,String(sound))},[sound,user.id])
 useEffect(()=>{
  if(!eligible)return
  const engine=createNotificationSound(localStorage,user.id);audio.current=engine
  const unlock=()=>{if(soundRef.current)engine.unlock().then(()=>engine.notify(soundItems.current)).catch(()=>{})}
  window.addEventListener('pointerdown',unlock);window.addEventListener('keydown',unlock)
  const repeat=setInterval(()=>{if(soundRef.current)engine.notify(soundItems.current.filter(item=>item.priority==='Critical'))},10000)
  return()=>{clearInterval(repeat);window.removeEventListener('pointerdown',unlock);window.removeEventListener('keydown',unlock);engine.close();audio.current=null}
 },[eligible,user.id])
 const enableSound=async()=>{
  if(sound){soundRef.current=false;setSound(false);setAudioMessage('Sound muted.');return}
  try{await audio.current.unlock();soundRef.current=true;setSound(true);audio.current.chime();setAudioMessage('Sound enabled. Critical alerts repeat twice at one-minute intervals until acknowledged.')}
  catch(e){setAudioMessage(e.message)}
 }
 const testSound=async critical=>{try{await audio.current.unlock();audio.current.chime(critical);setAudioMessage('Test chime played.')}catch(e){setAudioMessage(e.message)}}
 const refresh = useCallback(async () => {
  const sequence=++request.current
  try{
   const [counts,list,urgent] = await Promise.all([notificationSummary(),listNotifications(),listNotifications({filter:'Unacknowledged',priority:'Critical'})])
   if(!active.current || sequence !== request.current)return
   setSummary(counts);setRecent(list.items);setCritical(urgent.items);setError('')
   const unseen=list.items.filter(item=>!item.readAt&&!item.resolvedAt&&item.priority!=='Critical'&&!localStorage.getItem(`notification-seen-${user.id}-${item.id}`))
   for(const item of unseen)localStorage.setItem(`notification-seen-${user.id}-${item.id}`,'true')
   soundItems.current=[...urgent.items,...list.items.filter(item=>item.priority!=='Critical')]
   if(unseen.length)setToasts(previous=>[...unseen.slice(0,2),...previous].filter((item,index,array)=>array.findIndex(row=>row.id===item.id)===index).slice(0,3))
   if(soundRef.current)audio.current?.notify(soundItems.current)
  }catch(e){if(active.current)setError(e.message)}
 },[user.id])
 useEffect(()=>{
  if(!eligible)return
  active.current=true;queueMicrotask(refresh)
  const stream=new EventSource(notificationStreamUrl,{withCredentials:true})
  const update=()=>{setStatus('Live');refresh();window.dispatchEvent(new Event('booking-notifications-updated'))}
  stream.addEventListener('ready',update);stream.addEventListener('changed',update)
  stream.addEventListener('expired',()=>{stream.close();window.dispatchEvent(new Event('auth-expired'))})
  stream.onerror=()=>{setStatus('Reconnecting');refresh()}
  const recovery=setInterval(refresh,30000)
  return()=>{active.current=false;clearInterval(recovery);stream.close()}
 },[eligible,refresh])
 useEffect(()=>{if(!toasts.length)return;const timeout=setTimeout(()=>setToasts([]),8000);return()=>clearTimeout(timeout)},[toasts])
 useEffect(()=>{
  if(!centre)return
  let valid=true;queueMicrotask(()=>{if(valid)setLoading(true)})
  listNotifications(filters).then(data=>{if(valid){setResult(data);setError('')}}).catch(e=>{if(valid)setError(e.message)}).finally(()=>{if(valid)setLoading(false)})
  return()=>{valid=false}
 },[centre,filters,summary.cursor])
 useEffect(()=>{
  if(!centre)return
  const original=document.activeElement;centreRef.current?.focus()
  const handler=e=>{if(e.key==='Escape')setCentre(false);if(e.key==='Tab'){const focusable=[...centreRef.current.querySelectorAll('button,a,input,select,[tabindex="0"]')].filter(el=>!el.disabled);const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}}
  document.addEventListener('keydown',handler);return()=>{document.removeEventListener('keydown',handler);original?.focus()}
 },[centre])
 useEffect(()=>{if(!open)return;const handler=event=>{if(event.key==="Escape"){setOpen(false);bellRef.current?.focus()}};document.addEventListener("keydown",handler);return()=>document.removeEventListener("keydown",handler)},[open])
 const action=async (operation,id)=>{try{await operation(id);setToasts(items=>items.filter(item=>item.id!==id));await refresh()}catch(e){setError(e.message)}}
 const view=item=>{action(readNotification,item.id);setCentre(false);setOpen(false);onOpenBooking(item.kind,item.bookingId)}
 const card=item=><AlertCard key={item.id} item={item} onRead={id=>action(readNotification,id)} onAck={id=>action(acknowledgeNotification,id)} onOpen={view}/>
 if(!eligible)return null
 return <div className="booking-notifications">
  <button ref={bellRef} className="icon-button notification-button" aria-label={`Booking notifications, ${summary.unread} unread`} aria-expanded={open} onClick={()=>{onOpen?.();setOpen(!open)}}><Icon name="bell" size={20}/>{summary.unread>0&&<span className="booking-unread-count">{summary.unread>99?'99+':summary.unread}</span>}</button>
  {open&&<><button className="booking-notification-dismiss" aria-label="Close notification dropdown" onClick={()=>setOpen(false)}/><section className="booking-notification-dropdown"><div className="booking-notification-title"><strong>Booking notifications</strong><span className={`booking-live-status ${status==='Live'?'live':''}`}>{status}</span></div>{error&&<p role="alert" className="booking-notification-error">{error}</p>}<div className="booking-notification-scroll">{recent.length?recent.slice(0,5).map(card):<p className="booking-notification-empty">No booking notifications yet.</p>}</div><div className="booking-notification-toolbar"><button onClick={()=>action(readAllNotifications)}>Mark all read</button><button onClick={()=>{setOpen(false);setFilters({...filters,filter:'All',page:0});setCentre(true)}}>Notification centre <Icon name="arrow" size={14}/></button></div></section></>}
  {!centre&&critical.length>0&&<section className="booking-critical-stack" aria-label="Critical booking alerts" aria-live="polite"><div className="booking-critical-title"><Icon name="alert" size={18}/><strong>{summary.critical} critical booking {summary.critical===1?'alert':'alerts'}</strong></div>{critical.slice(0,2).map(card)}<button className="booking-attention-button" onClick={()=>{setFilters({...filters,filter:'Unresolved',page:0});setCentre(true)}}>Open attention queue · {summary.unresolved} unresolved</button><small>Acknowledgement confirms you saw the alert. It does not resolve the booking.</small></section>}
  {!centre&&toasts.length>0&&<section className="booking-toast-stack" aria-live="polite" aria-label="New booking notifications">{toasts.map(item=><div className="booking-toast" key={item.id}><Icon name="bookings" size={20}/><div><strong>{item.title}</strong><p>{item.details.reference} · {item.details.customer}</p><button onClick={()=>view(item)}>View booking</button></div><button className="booking-toast-close" aria-label={`Dismiss ${item.details.reference} popup`} onClick={()=>setToasts(items=>items.filter(row=>row.id!==item.id))}><Icon name="close" size={16}/></button></div>)}</section>}
  {centre&&<div className="booking-centre-backdrop" onClick={()=>setCentre(false)}><section ref={centreRef} tabIndex={-1} className="booking-centre" role="dialog" aria-modal="true" aria-labelledby="booking-centre-title" onClick={e=>e.stopPropagation()}><header><div><span className="booking-live-status">{status} · Times in KSA</span><h2 id="booking-centre-title">Booking notification centre</h2><p>{summary.unread} unread · {summary.unresolved} unresolved · {summary.critical} critical awaiting acknowledgement</p></div><button className="icon-button" aria-label="Close notification centre" onClick={()=>setCentre(false)}><Icon name="close"/></button></header><div className="booking-centre-tools"><button onClick={()=>action(readAllNotifications)}>Mark all read</button><button onClick={()=>{refresh();setFilters({...filters})}}><Icon name="reset" size={14}/>Refresh</button><button aria-pressed={sound} onClick={enableSound}>{sound?'Mute sound':'Enable sound'}</button><button onClick={()=>testSound(false)}>Test booking sound</button><button onClick={()=>testSound(true)}>Test critical sound</button></div><p className="booking-sound-status" role="status">{audioMessage || (sound ? 'Sound enabled. Click anywhere to activate audio after reopening the browser.' : 'Sound muted. Enable sound to hear booking alerts.')}</p><div className="booking-centre-filters">{[['filter','Show',['All','Unread','Unresolved','Unacknowledged']],['kind','Booking type',['','Individual','Corporate']],['priority','Priority',['','Critical','Action required','Information']],['type','Alert type',['','Created','Confirmation','Assignment','Pickup','Missed handover','Overdue return','Rescheduled','Cancelled','Assigned','Updated','Status','Escalation']]].map(([field,label,values])=><label key={field}>{label}<select value={filters[field]} onChange={e=>setFilters({...filters,[field]:e.target.value,page:0})}>{values.map(value=><option key={value} value={value}>{value||'All'}</option>)}</select></label>)}<label>From<input type="date" value={filters.from} onChange={e=>setFilters({...filters,from:e.target.value,page:0})}/></label><label>To<input type="date" value={filters.to} min={filters.from} onChange={e=>setFilters({...filters,to:e.target.value,page:0})}/></label></div>{error&&<p role="alert" className="booking-notification-error">{error}</p>}<div className="booking-centre-list">{loading?<p role="status">Loading notifications…</p>:result.items.length?result.items.map(card):<p className="booking-notification-empty">No notifications match these filters.</p>}</div><footer><span>{result.total} notifications · Page {filters.page+1}</span><div><button disabled={!filters.page} onClick={()=>setFilters({...filters,page:filters.page-1})}>Previous</button><button disabled={(filters.page+1)*25>=result.total} onClick={()=>setFilters({...filters,page:filters.page+1})}>Next</button></div></footer><p className="booking-notification-note">Alerts resolve when the booking condition is corrected. Supervisor escalation after {summary.escalationMinutes||15} minutes without acknowledgement. Email escalation: {summary.emailEscalation?'enabled':'not enabled'}.</p></section></div>}
 </div>
}
