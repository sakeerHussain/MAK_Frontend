import { useEffect, useRef } from 'react'
import { isWriteAction } from './permissions.js'
export default function ReadOnlyScope({ enabled, children }) {
  const root = useRef(null)
  useEffect(() => {
    if (!enabled || !root.current) return
    const apply = () => {
      root.current.querySelectorAll('button,input[type="file"]').forEach((element) => {
        if (element.type === 'file' || isWriteAction(element.getAttribute('aria-label') || element.textContent)) {
          if (!element.disabled) element.disabled = true
          element.title = 'Your role has read-only access to this module.'
        }
      })
    }
    apply()
    const observer = new MutationObserver(apply)
    observer.observe(root.current, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [enabled])
  return <div ref={root}>{enabled && <p className="access-readonly" role="note">Your role has read-only access to this module.</p>}{children}</div>
}
