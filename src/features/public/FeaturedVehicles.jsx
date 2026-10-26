import { useEffect, useRef, useState } from 'react'
import { IconArrowLeft, IconArrowRight, IconHeart, IconUsers, IconSettings, IconGasStation, IconMapPin } from '@tabler/icons-react'

import { vehicles } from './FleetData.js'

function VehicleRail({ cars, saved, setSaved, onEnquire }) {
  const rail = useRef(null)
  const [position, setPosition] = useState({ index:0, stops:[0], photoHeight:0 })
  useEffect(() => {
    const element = rail.current
    if (!element) return
    const update = () => {
      const max = Math.max(0, element.scrollWidth - element.clientWidth)
      const stops = [...new Set([...element.children].map(card => Math.min(card.offsetLeft - element.firstElementChild.offsetLeft, max))) ]
      const index = stops.reduce((best, stop, i) => Math.abs(stop - element.scrollLeft) < Math.abs(stops[best] - element.scrollLeft) ? i : best, 0)
      setPosition({ index, stops:stops.length ? stops : [0], photoHeight:element.querySelector('.rent-vehicle-photo')?.getBoundingClientRect().height || 0 })
    }
    update()
    const resize = new ResizeObserver(update)
    resize.observe(element)
    element.addEventListener('scroll', update, { passive:true })
    return () => { resize.disconnect(); element.removeEventListener('scroll', update) }
  }, [])
  const move = index => rail.current?.scrollTo({ left:position.stops[index], behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  return <>
    <div className="rent-featured-stage" style={{ '--rent-arrow-y': `${position.photoHeight / 2 + 2}px` }}>
      {cars.length > 0 && <div className="rent-edge-navigation" aria-label="Featured vehicle navigation">
        <button type="button" aria-label="Previous vehicles" aria-controls="rent-featured-rail" disabled={position.index === 0} onClick={() => move(position.index - 1)}><IconArrowLeft size={22}/></button>
        <button type="button" aria-label="Next vehicles" aria-controls="rent-featured-rail" disabled={position.index === position.stops.length - 1} onClick={() => move(position.index + 1)}><IconArrowRight size={22}/></button>
      </div>}
    <div ref={rail} id="rent-featured-rail" className="rent-featured-rail" role="region" aria-label="Featured vehicles carousel" tabIndex={0} data-lenis-prevent onKeyDown={event => {
      if (event.target !== event.currentTarget) return
      if (['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
        event.preventDefault()
        move(event.key === 'Home' ? 0 : event.key === 'End' ? position.stops.length - 1 : Math.max(0, Math.min(position.stops.length - 1, position.index + (event.key === 'ArrowRight' ? 1 : -1))))
      }
    }}>
      {cars.map(car => <article className="rent-vehicle" key={car.id} aria-label={car.name}>
        <div className="rent-vehicle-photo"><img src={`/images/rentals/featured/${car.id}.webp`} alt={`${car.name}, illustrative rental vehicle`} width="800" height="600" loading="lazy" decoding="async"/>
          <button className={`rent-save ${saved.includes(car.id) ? 'is-saved' : ''}`} type="button" aria-label={`Save ${car.name}`} aria-pressed={saved.includes(car.id)} onClick={() => setSaved(current => current.includes(car.id) ? current.filter(id => id !== car.id) : [...current,car.id])}><IconHeart size={20}/></button>
        </div>
        <div className="rent-vehicle-copy"><h3>{car.name}</h3><p>{car.description}</p>
          <div className="rent-featured-specs"><span><IconUsers size={15}/>5 seats</span><span><IconSettings size={15}/>Automatic</span><span><IconGasStation size={15}/>Petrol</span></div>
          <div className="rent-featured-location"><IconMapPin size={15}/>Saudi Arabia</div>
          <div className="rent-featured-price"><strong>SAR {car.rate.toLocaleString('en-SA')}</strong><span>/ day</span><small>Sample rate</small></div>
          <button className="rent-button" type="button" aria-label={`Enquire about ${car.name}`} onClick={() => onEnquire({ category:car.category, preference:'Self-drive', notes:`Preferred vehicle: ${car.name}. Sample rental rate: SAR ${car.rate} per day (demo only). Please confirm availability and final quotation.` })}>Enquire now <IconArrowRight size={17}/></button>
        </div>
      </article>)}
    </div>
    </div>
    {cars.length > 0 && <div className="rent-featured-dots" aria-label="Carousel positions">{position.stops.map((stop,index) => <button key={stop} type="button" aria-label={`Go to vehicle position ${index + 1}`} aria-current={index === position.index ? 'true' : undefined} onClick={() => move(index)} />)}</div>}
    <span className="rent-sr-only" role="status">{cars.length ? `Vehicle position ${position.index + 1} of ${position.stops.length}` : 'No vehicles in this selection'}</span>
  </>
}

export default function FeaturedVehicles({ category, setCategory, saved, setSaved, savedOnly, setSavedOnly, onEnquire }) {
  const cars = vehicles.filter(car => (category === 'All vehicles' || category === car.category) && (!savedOnly || saved.includes(car.id)))
  const showAll = () => { setCategory('All vehicles'); setSavedOnly(false) }
  return <section className="rent-container rent-section rent-featured" id="rent-collection" aria-labelledby="rent-featured-title">
    <header className="rent-uniform-heading rent-featured-heading"><h2 className="rent-section-title" id="rent-featured-title">Featured vehicles</h2><button type="button" className="rent-featured-view-all" onClick={showAll}>View all vehicles <IconArrowRight size={18} aria-hidden="true"/></button></header>
    <VehicleRail key={`${category}-${savedOnly}-${cars.map(car => car.id).join(',')}`} cars={cars} saved={saved} setSaved={setSaved} onEnquire={onEnquire}/>
    {!cars.length && <div className="rent-empty"><IconHeart size={28}/><h3>No vehicles in this selection</h3><p>Save a vehicle using its heart icon, or explore the full collection.</p><button className="rent-button" type="button" onClick={showAll}>Show all vehicles</button></div>}
  </section>
}
