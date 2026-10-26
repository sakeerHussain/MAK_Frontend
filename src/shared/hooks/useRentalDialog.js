import { useEffect, useEffectEvent } from 'react'

// Keep modal ownership separate from React renders. Only the top modal handles keys.
const dialogs=[]
const background=new Map()
let bodyOverflow=''
function isolateBackground(){
  for(const [element,inert] of background){element.inert=inert}
  background.clear()
  const top=dialogs.at(-1)?.dialog
  if(!top)return
  for(let branch=top.closest('.booking-overlay')||top;branch?.parentElement;branch=branch.parentElement){
    for(const sibling of branch.parentElement.children){
      if(sibling===branch||!(sibling instanceof HTMLElement))continue
      background.set(sibling,sibling.inert);sibling.inert=true
    }
    if(branch.parentElement===document.body)break
  }
}
const available=element=>element?.isConnected&&!element.closest('[inert]')&&!element.matches(':disabled')&&element.getClientRects().length&&getComputedStyle(element).visibility!=='hidden'

export default function useRentalDialog(open,onClose,dialogRef){
  const close=useEffectEvent(()=>onClose())
  useEffect(()=>{
    if(!open)return
    const dialog=dialogRef?.current||document.querySelector('.booking-dialog[role="dialog"]')
    if(!dialog)return
    const trigger=document.activeElement
    const previousTabIndex=dialog.getAttribute('tabindex')
    if(previousTabIndex===null)dialog.setAttribute('tabindex','-1')
    const entry={dialog}
    if(!dialogs.length){bodyOverflow=document.body.style.overflow;document.body.style.overflow='hidden'}
    dialogs.push(entry);isolateBackground()
    const controls=()=>[...dialog.querySelectorAll('button,input,select,textarea,a[href],summary,[contenteditable="true"],[tabindex]')].filter(element=>available(element)&&element.tabIndex>=0)
    const focusStart=()=>{
      const initial=dialog.querySelector('[data-dialog-initial-focus]')
      ;(available(initial)?initial:controls()[0]||dialog).focus({preventScroll:true})
    }
    const key=event=>{
      if(dialogs.at(-1)!==entry)return
      if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();return}
      if(event.key!=='Tab')return
      const list=controls(),first=list[0],last=list.at(-1),active=document.activeElement
      if(!first){event.preventDefault();dialog.focus();return}
      if(!list.includes(active)){event.preventDefault();(event.shiftKey?last:first).focus();return}
      if(event.shiftKey&&active===first){event.preventDefault();last.focus()}
      else if(!event.shiftKey&&active===last){event.preventDefault();first.focus()}
    }
    const containFocus=event=>{if(dialogs.at(-1)===entry&&!dialog.contains(event.target))focusStart()}
    document.addEventListener('keydown',key,true)
    document.addEventListener('focusin',containFocus,true)
    focusStart()
    return ()=>{
      document.removeEventListener('keydown',key,true);document.removeEventListener('focusin',containFocus,true)
      const index=dialogs.indexOf(entry);if(index>=0)dialogs.splice(index,1)
      isolateBackground()
      if(!dialogs.length)document.body.style.overflow=bodyOverflow
      if(previousTabIndex===null)dialog.removeAttribute('tabindex')
      const next=available(trigger)?trigger:dialogs.at(-1)?.dialog||document.querySelector('main')
      if(next?.isConnected&&!next.closest('[inert]')){
        const temporary=next.tabIndex<0&&next.getAttribute('tabindex')===null
        if(temporary)next.setAttribute('tabindex','-1')
        next.focus({preventScroll:true})
        // Removing tabindex immediately can blur a focused main/heading in Chromium.
        if(temporary)next.addEventListener('blur',()=>{if(next.getAttribute('tabindex')==='-1')next.removeAttribute('tabindex')},{once:true})
      }
    }
  },[open,dialogRef])
}
