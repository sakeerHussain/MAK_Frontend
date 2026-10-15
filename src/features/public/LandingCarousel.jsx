import { useEffect, useRef, useState } from 'react'
import Icon from '../../app/Icon.jsx'

export default function LandingCarousel({ children, label }) {
  const track = useRef(null)
  const [edges, setEdges] = useState({ start: true, end: false })
  useEffect(() => {
    const element = track.current
    const update = () => setEdges({ start: element.scrollLeft < 5, end: element.scrollLeft + element.clientWidth >= element.scrollWidth - 5 })
    update()
    element.addEventListener('scroll', update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => { element.removeEventListener('scroll', update); observer.disconnect() }
  }, [])
  const move = (direction) => {
    const element = track.current
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    element.scrollBy({ left: direction * (element.firstElementChild?.getBoundingClientRect().width + 24 || element.clientWidth), behavior: reduced ? 'instant' : 'smooth' })
  }
  return <div className="mak-carousel">
    <div ref={track} className="mak-carousel-track" role="region" aria-label={label} tabIndex={0} onKeyDown={(event) => {
      if (event.target !== event.currentTarget || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return
      event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1)
    }}>{children}</div>
    <div className="mak-carousel-bottom"><span>Explore at your own pace <span aria-hidden="true">&middot;</span> Swipe or use the arrows</span><div>
      <button type="button" className="mak-round-button" aria-label={`Previous ${label}`} disabled={edges.start} onClick={() => move(-1)}><Icon name="arrow" className="mak-flip" size={18} /></button>
      <button type="button" className="mak-round-button" aria-label={`Next ${label}`} disabled={edges.end} onClick={() => move(1)}><Icon name="arrow" size={18} /></button>
    </div></div>
  </div>
}
