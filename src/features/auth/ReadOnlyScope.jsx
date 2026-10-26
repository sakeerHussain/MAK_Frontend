import {useEffect,useRef} from 'react'
import {actionPermissions,isWriteAction} from './permissions.js'
import {allowsPermission,requiredPermission} from './PermissionRules.js'
import './ReadOnlyScope.css'

export default function ReadOnlyScope({enabled,user,module,children}){
 const root=useRef(null)
 const blocked=element=>user
  ? !allowsPermission(user.permissions,requiredPermission(element,module,actionPermissions))
  : enabled&&(element.matches('input[type="file"]')||isWriteAction(element.getAttribute('aria-label')||element.textContent||''))
 useEffect(()=>{
  if(!root.current)return
  const originals=new Map()
  const restore=element=>{const previous=originals.get(element);if(!previous)return;for(const [key,value] of Object.entries(previous)){if(value===null)element.removeAttribute(key);else element.setAttribute(key,value)}element.removeAttribute('data-permission-denied');originals.delete(element)}
  const apply=()=>root.current.querySelectorAll('button,input[type="file"]').forEach(element=>{
   const denied=user?!allowsPermission(user.permissions,requiredPermission(element,module,actionPermissions)):enabled&&(element.type==='file'||isWriteAction(element.getAttribute('aria-label')||element.textContent||''))
   if(!denied){restore(element);return}
   if(!originals.has(element))originals.set(element,{'aria-disabled':element.getAttribute('aria-disabled'),title:element.getAttribute('title')})
   if(element.getAttribute('aria-disabled')!=='true')element.setAttribute('aria-disabled','true')
   if(!element.hasAttribute('data-permission-denied'))element.setAttribute('data-permission-denied','true')
   if(element.title!=='Your role does not allow this action.')element.title='Your role does not allow this action.'
  })
  apply();const observer=new MutationObserver(apply);observer.observe(root.current,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['data-permission','data-permission-scope','data-upload-permission','aria-label','disabled']})
  return()=>{observer.disconnect();for(const element of originals.keys())restore(element)}
 },[enabled,user,module])
 const stop=event=>{
  const element=event.target.closest('button,input[type="file"]')
  if(element&&blocked(element)){event.preventDefault();event.stopPropagation()}
 }
 const submit=event=>{
  const element=event.nativeEvent.submitter||event.target
  if(blocked(element)){event.preventDefault();event.stopPropagation()}
 }
 return <div ref={root} onChangeCapture={event=>{if(event.target.matches('input[type="file"]')&&blocked(event.target)){event.target.value='';event.preventDefault();event.stopPropagation()}}} onDropCapture={event=>{const input=event.target.closest('label')?.querySelector('input[type="file"]');if(input&&blocked(input)){event.preventDefault();event.stopPropagation()}}} onKeyDownCapture={event=>{if(event.key==='Enter'){const scope=event.target.closest('[data-permission-scope]');if(scope&&blocked(scope)){event.preventDefault();event.stopPropagation()}}}} onClickCapture={stop} onSubmitCapture={submit}>{enabled&&<p className="access-readonly" role="note">Your role has read-only access to this module.</p>}{children}</div>
}
