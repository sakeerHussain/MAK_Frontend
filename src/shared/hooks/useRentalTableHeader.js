import { useEffect, useRef } from 'react'

// Translate the real table header within its horizontal scroller. CSS sticky
// alone would attach to that scroller instead of the admin's vertical scroller.
export default function useRentalTableHeader(detailOpen) {
  const tableRef = useRef(null)
  useEffect(() => {
    const table = tableRef.current
    const scroller = table?.closest('.main-scroll')
    if (!table || !scroller || detailOpen) return
    let frame
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const height = table.tHead?.offsetHeight || 0
        const offset = Math.max(0, Math.min(scroller.getBoundingClientRect().top - table.getBoundingClientRect().top, table.offsetHeight - height))
        table.style.setProperty('--rental-header-offset', `${offset}px`)
      })
    }
    scroller.addEventListener('scroll', update, { passive: true })
    const resize = new ResizeObserver(update); resize.observe(table)
    window.addEventListener('resize', update)
    update()
    return () => { cancelAnimationFrame(frame); scroller.removeEventListener('scroll', update); window.removeEventListener('resize', update); resize.disconnect() }
  }, [detailOpen])
  return tableRef
}
