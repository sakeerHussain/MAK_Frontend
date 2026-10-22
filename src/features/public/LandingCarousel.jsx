import { Children, useEffect, useId, useRef, useState } from 'react'

export default function LandingCarousel({ children, label }) {
  const track = useRef(null)
  const trackId = useId()
  const childCount = Children.count(children)
  const [navigation, setNavigation] = useState({ offsets: [0], active: 0, visibleCount: 1 })

  useEffect(() => {
    const element = track.current
    const update = () => {
      const firstCard = element.firstElementChild
      const gap = Number.parseFloat(getComputedStyle(element).columnGap) || 0
      const step = (firstCard?.getBoundingClientRect().width || element.clientWidth) + gap
      const visibleCount = Math.max(1, Math.floor((element.clientWidth + gap + 1) / Math.max(1, step)))
      const maxScroll = Math.max(0, element.scrollWidth - element.clientWidth)
      const pageCount = maxScroll < 2 ? 1 : Math.ceil(childCount / visibleCount)
      const offsets = Array.from({ length: pageCount }, (_, index) => Math.min(index * visibleCount * step, maxScroll))
      const active = offsets.reduce((nearest, offset, index) => Math.abs(offset - element.scrollLeft) < Math.abs(offsets[nearest] - element.scrollLeft) ? index : nearest, 0)

      setNavigation((previous) => previous.active === active && previous.visibleCount === visibleCount && previous.offsets.length === offsets.length && previous.offsets.every((offset, index) => Math.abs(offset - offsets[index]) < 1)
        ? previous : { offsets, active, visibleCount })
    }

    update()
    element.addEventListener('scroll', update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(element)
    if (element.firstElementChild) observer.observe(element.firstElementChild)
    return () => { element.removeEventListener('scroll', update); observer.disconnect() }
  }, [childCount])

  const goToPage = (index) => {
    const page = Math.max(0, Math.min(index, navigation.offsets.length - 1))
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    track.current.scrollTo({ left: navigation.offsets[page], behavior: reduced ? 'instant' : 'smooth' })
  }

  return <div className="mak-carousel">
    <div ref={track} id={trackId} className="mak-carousel-track" role="region" aria-roledescription="carousel" aria-label={label} tabIndex={0} onKeyDown={(event) => {
      if (event.target !== event.currentTarget || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
      event.preventDefault()
      if (event.key === 'Home') { goToPage(0); return }
      if (event.key === 'End') { goToPage(navigation.offsets.length - 1); return }
      const element = track.current
      const gap = Number.parseFloat(getComputedStyle(element).columnGap) || 0
      const step = (element.firstElementChild?.getBoundingClientRect().width || element.clientWidth) + gap
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      element.scrollBy({ left: (event.key === 'ArrowRight' ? 1 : -1) * step, behavior: reduced ? 'instant' : 'smooth' })
    }}>{children}</div>
    {navigation.offsets.length > 1 && <div className="mak-carousel-dots" role="group" aria-label={`${label} navigation`}>
      {navigation.offsets.map((_, index) => <button type="button" key={index} aria-controls={trackId} aria-label={`Show ${label} ${index * navigation.visibleCount + 1} to ${Math.min((index + 1) * navigation.visibleCount, childCount)}`} aria-current={navigation.active === index ? 'true' : undefined} onClick={() => goToPage(index)} />)}
    </div>}
  </div>
}
