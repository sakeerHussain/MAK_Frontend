import { useCallback, useEffect, useRef, useState } from 'react'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import Icon from '../../app/Icon.jsx'
import LandingCarousel from './LandingCarousel.jsx'
import RentalEnquiry from './RentalEnquiry.jsx'
import { faqs, fleet, fleetCategories, heroSlides, imageUrl, locations, processSteps, rentalPreferences, services } from './LandingData.js'
import './LandingPage.css'

function Brand({ onClick }) {
  return <a href="#/home" className="mak-brand" aria-label="MAK Rentals home" onClick={onClick}><span className="mak-brand-mark" aria-hidden="true">M<span /></span><span>MAK<span className="mak-brand-subtitle">CAR RENTALS</span></span></a>
}

function Photo({ id, alt, eager = false, className = '' }) {
  const [failed, setFailed] = useState(false)
  return <div className={`mak-photo ${className} ${failed ? 'mak-photo-fallback' : ''}`}>
    {failed ? <span><Icon name="fleet" size={42} /><span>MAK RENTALS</span><small>Illustrative vehicle image</small></span> : <img src={imageUrl(id, eager ? 2200 : 1100)} alt={alt} loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'} decoding="async" onError={() => setFailed(true)} />}
  </div>
}

function SectionHeading({ eyebrow, children, text, centered = false }) {
  return <div className={`mak-section-heading ${centered ? 'mak-centered' : ''}`} data-reveal><div><span className="mak-eyebrow">{eyebrow}</span><h2>{children}</h2></div>{text && <p>{text}</p>}</div>
}

export default function LandingPage({ user }) {
  const root = useRef(null)
  const lenis = useRef(null)
  const menuButton = useRef(null)
  const [scrolled, setScrolled] = useState(() => window.scrollY > 70)
  const [menu, setMenu] = useState(false)
  const [slideIndex, setSlideIndex] = useState(0)
  const [category, setCategory] = useState('All vehicles')
  const [location, setLocation] = useState('Al Khobar')
  const [preference, setPreference] = useState('Self-drive')
  const [pickup, setPickup] = useState('')
  const [returnDate, setReturnDate] = useState('')
  const [finderError, setFinderError] = useState('')
  const [enquiry, setEnquiry] = useState(null)
  const slide = heroSlides[slideIndex]
  const login = user ? '#/dashboard' : '#/sign-in'
  const today = new Date().toLocaleDateString('en-CA')
  const filteredFleet = fleet.filter((car) => category === 'All vehicles' || car.category === category)
  const closeEnquiry = useCallback(() => setEnquiry(null), [])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const setup = () => {
      lenis.current?.destroy()
      lenis.current = media.matches ? null : new Lenis({ autoRaf: true, duration: 1.05, smoothWheel: true, anchors: false })
    }
    setup()
    media.addEventListener('change', setup)
    return () => { media.removeEventListener('change', setup); lenis.current?.destroy(); lenis.current = null }
  }, [])

  useEffect(() => {
    const element = root.current
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = null
    const update = () => {
      const position = window.scrollY
      const distance = document.documentElement.scrollHeight - window.innerHeight
      setScrolled(position > 70)
      element.style.setProperty('--mak-scroll-progress', Math.max(0, Math.min(1, distance > 0 ? position / distance : 0)))
      element.style.setProperty('--mak-hero-offset', `${media.matches ? 0 : Math.min(position * 0.15, 160)}px`)
      frame = null
    }
    const onScroll = () => { if (frame === null) frame = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (frame !== null) cancelAnimationFrame(frame) }
  }, [])

  useEffect(() => {
    const element = root.current
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (media.matches || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target) } })
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' })
    element.querySelectorAll('[data-reveal]').forEach((item) => observer.observe(item))
    element.classList.add('mak-motion-ready')
    return () => { observer.disconnect(); element.classList.remove('mak-motion-ready') }
  }, [])

  useEffect(() => {
    if (!menu) return
    const handleKey = (event) => { if (event.key === 'Escape') { setMenu(false); menuButton.current?.focus() } }
    const media = window.matchMedia('(min-width: 961px)')
    const handleResize = () => { if (media.matches) setMenu(false) }
    document.addEventListener('keydown', handleKey)
    media.addEventListener('change', handleResize)
    return () => { document.removeEventListener('keydown', handleKey); media.removeEventListener('change', handleResize) }
  }, [menu])

  const go = (id) => {
    setMenu(false)
    const target = document.getElementById(id)
    if (!target) return
    if (lenis.current) lenis.current.scrollTo(target, { offset: -98 })
    else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 98, behavior: 'instant' })
  }
  const openEnquiry = (values = {}) => {
    setMenu(false)
    setEnquiry({ category, location, preference, pickup, returnDate, ...values })
  }
  const explore = (event) => {
    event.preventDefault()
    if (pickup && returnDate && returnDate < pickup) { setFinderError('Choose a return date on or after your pickup date.'); return }
    setFinderError(''); go('mak-fleet')
  }
  const changeSlide = (offset) => setSlideIndex((current) => (current + offset + heroSlides.length) % heroSlides.length)

  return <div ref={root} className="mak-landing">
    <a className="mak-skip" href="#mak-main" onClick={(event) => { event.preventDefault(); document.getElementById('mak-main')?.focus(); go('mak-main') }}>Skip to content</a>
    <header className={`mak-header ${scrolled ? 'is-scrolled' : ''} ${menu ? 'is-open' : ''}`}>
      <div className="mak-container mak-header-inner">
        <Brand onClick={(event) => { event.preventDefault(); go('mak-home') }} />
        <nav id="mak-navigation" className={menu ? 'is-open' : ''} aria-label="Main navigation">
          {[['Home', 'mak-home'], ['About', 'mak-about'], ['Services', 'mak-services'], ['Our fleet', 'mak-fleet'], ['For business', 'mak-business']].map(([label, id]) => <button type="button" key={id} onClick={() => go(id)}>{label}</button>)}
          <a className="mak-nav-login" href={login}>{user ? 'Dashboard' : 'Sign in'}<Icon name="arrow" size={15} /></a>
        </nav>
        <button type="button" className="mak-button mak-header-cta" onClick={() => openEnquiry()}>Plan a rental <Icon name="arrow" size={16} /></button>
        <button type="button" ref={menuButton} className="mak-menu-button" aria-label={menu ? 'Close navigation' : 'Open navigation'} aria-expanded={menu} aria-controls="mak-navigation" onClick={() => setMenu((value) => !value)}><Icon name={menu ? 'close' : 'menu'} size={23} /></button>
      </div>
    </header>

    <main id="mak-main" tabIndex={-1}>
      <section className="mak-hero" id="mak-home" aria-label="Rental inspiration" aria-roledescription="carousel">
        <div className="mak-hero-images" aria-hidden="true">{heroSlides.map((item, index) => <div key={item.image} className={`mak-hero-image ${slideIndex === index ? 'is-active' : ''}`}><Photo id={item.image} alt="" eager={index === 0} /></div>)}</div>
        <div className="mak-hero-overlay" />
        <div className="mak-container mak-hero-content">
          <div className="mak-hero-copy" key={slideIndex}>
            <h1>{slide.title}<br /><em>{slide.accent}</em></h1>
            <p>{slide.text}</p>
            <div className="mak-hero-buttons"><button type="button" className="mak-button" onClick={() => { setCategory(slide.category); go('mak-fleet') }}>Explore the collection <Icon name="arrow" size={18} /></button><button type="button" className="mak-button mak-button-outline" onClick={() => openEnquiry({ category: slide.category })}>Plan your journey <Icon name="arrow" size={18} /></button></div>
          </div>
          <div className="mak-hero-meta"><span>PERSONAL JOURNEYS.<br /><strong>BUSINESS POSSIBILITIES.</strong></span><span className="mak-hero-rule" /><span>Daily & monthly rentals<br />Self-drive & with a driver</span></div>
        </div>
        <div className="mak-hero-pagination" role="group" aria-label="Choose hero slide">{heroSlides.map((item, index) => <button type="button" key={item.label} className={slideIndex === index ? 'is-active' : ''} aria-label={`Show slide ${index + 1}: ${item.title} ${item.accent}`} aria-pressed={slideIndex === index} onClick={() => setSlideIndex(index)}><span>0{index + 1}</span><i /></button>)}</div>
        <div className="mak-container mak-hero-bottom"><button type="button" className="mak-scroll-cue" onClick={() => go('mak-finder')}><span><Icon name="arrow" size={17} /></span>SCROLL TO EXPLORE</button><span className="mak-hero-caption">{slide.caption}<small>Illustrative photography</small></span><div className="mak-hero-arrows"><button type="button" className="mak-round-button" aria-label="Previous hero slide" onClick={() => changeSlide(-1)}><Icon name="arrow" size={18} className="mak-flip" /></button><button type="button" className="mak-round-button" aria-label="Next hero slide" onClick={() => changeSlide(1)}><Icon name="arrow" size={18} /></button></div></div>
      </section>

      <section className="mak-finder-area" id="mak-finder" aria-labelledby="mak-finder-title"><div className="mak-container">
        <div className="mak-finder-top"><h2 id="mak-finder-title">Where will the road take you?</h2><span>YOUR JOURNEY, YOUR WAY</span></div>
        <form className="mak-finder" onSubmit={explore}>
          <label><span><Icon name="fleet" size={16} />Vehicle type</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{fleetCategories.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span><Icon name="tracking" size={16} />Pickup location</span><input aria-label="Pickup location" list="mak-pickup-locations" value={location} required onChange={(event) => setLocation(event.target.value)} placeholder="City or address" autoComplete="off" /><datalist id="mak-pickup-locations">{locations.map((item) => <option key={item} value={item} />)}</datalist></label>
          <label><span><Icon name="calendar" size={16} />Pickup date</span><input aria-label="Pickup date" type="date" min={today} value={pickup} onChange={(event) => { setPickup(event.target.value); setFinderError('') }} /></label>
          <label><span><Icon name="calendar" size={16} />Return date</span><input aria-label="Return date" type="date" min={pickup || today} value={returnDate} onChange={(event) => { setReturnDate(event.target.value); setFinderError('') }} /></label>
          <button type="submit" className="mak-button">Find my drive <Icon name="arrow" size={18} /></button>
        </form>
        <div className="mak-finder-bottom"><span><Icon name="document" size={13} />Sample collection. Availability and rates confirmed by our team.</span><label>Rental preference<select aria-label="Rental preference" value={preference} onChange={(event) => setPreference(event.target.value)}>{rentalPreferences.map((item) => <option key={item}>{item}</option>)}</select></label></div>
        {finderError && <p className="mak-form-error" role="alert">{finderError}</p>}
      </div></section>

      <section className="mak-section mak-about mak-container" id="mak-about">
        <div className="mak-about-copy" data-reveal><span className="mak-eyebrow">THE MAK EXPERIENCE</span><h2>More than a car.<br />A better way <em>to move.</em></h2><p>A great rental should fit your life, not the other way around. From a simple city drive to a business journey with multiple destinations, start with a plan that works for you.</p><p>Thoughtful choices. Flexible rental options. A more personal approach to every mile.</p><ul className="mak-check-list"><li><span><Icon name="check" size={14} /></span>Daily, monthly & corporate rental options</li><li><span><Icon name="check" size={14} /></span>Your choice of self-drive or a driver</li></ul><button type="button" className="mak-button" onClick={() => go('mak-services')}>Discover the difference <Icon name="arrow" size={18} /></button></div>
        <div className="mak-about-visual" data-reveal style={{ '--mak-delay': '130ms' }}><Photo id="photo-1449965408869-eaa3f722e40d" alt="A driver's view of an open road through the countryside" /><span className="mak-photo-tag">A LITTLE FREEDOM.<br /><strong>A lot of possibility.</strong></span><div className="mak-about-stamp"><Icon name="tracking" size={26} /><span>Made for<br /><strong>your journey.</strong></span></div></div>
      </section>

      <section className="mak-section mak-services" id="mak-services"><div className="mak-container">
        <SectionHeading eyebrow="WHAT MOVES YOU?" text="One destination or many. A day or a month. Explore a rental experience built around your plans.">A service for <em>every journey.</em></SectionHeading>
        <LandingCarousel label="rental services">{services.map((item, index) => <article className="mak-service-card" key={item.title}>
          <Photo id={item.image} alt={`${item.title} illustrative photograph`} /><div className="mak-service-shade" /><span className="mak-service-index">0{index + 1}</span><div className="mak-service-copy"><Icon name={item.icon} size={25} /><h3>{item.title}</h3><p>{item.description}</p></div><div className="mak-card-cutout"><button type="button" className="mak-round-button" aria-label={`Enquire about ${item.title.toLowerCase()}`} onClick={() => openEnquiry({ preference: item.preference })}><Icon name="arrow" size={21} /></button></div>
        </article>)}</LandingCarousel>
      </div></section>

      <section className="mak-section mak-fleet mak-container" id="mak-fleet">
        <SectionHeading eyebrow="THE COLLECTION" text="A little practicality. A little luxury. Find the right starting point for your next journey.">Your next <em>great drive.</em></SectionHeading>
        <div className="mak-fleet-toolbar"><div className="mak-tabs" role="group" aria-label="Filter fleet by vehicle category">{fleetCategories.map((item) => <button type="button" key={item} className={category === item ? 'is-active' : ''} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div><span aria-live="polite">{filteredFleet.length} {filteredFleet.length === 1 ? 'category' : 'categories'} to explore</span></div>
        <div className="mak-fleet-grid">{filteredFleet.map((car) => <article key={car.id} className="mak-fleet-card"><div className="mak-fleet-photo"><Photo id={car.image} alt={`${car.subtitle}, illustrative vehicle`} /><span>{car.category}</span><button type="button" className="mak-round-button" aria-label={`Enquire about ${car.subtitle.toLowerCase()}`} onClick={() => openEnquiry({ category: car.category })}><Icon name="arrow" size={20} /></button></div><div className="mak-fleet-body"><span className="mak-kicker">{car.subtitle}</span><h3>{car.title}</h3><div className="mak-fleet-specs"><span><Icon name="users" size={16} />{car.seats}</span><span><Icon name="tracking" size={16} />{car.luggage}</span></div><div className="mak-fleet-price"><span>Personalised rates<small>Based on your rental requirements</small></span><button type="button" className="mak-text-button" onClick={() => openEnquiry({ category: car.category })}>Enquire <Icon name="arrow" size={17} /></button></div></div></article>)}</div>
        <p className="mak-collection-note">Illustrative collection. Specific models, seating, rates and availability will be confirmed with your quotation.</p>
      </section>

      <section className="mak-types mak-section"><div className="mak-container"><SectionHeading eyebrow="FIND YOUR FIT" centered>The right car. <em>Your kind of journey.</em></SectionHeading><div className="mak-type-grid">{fleet.map((car, index) => <button type="button" className="mak-type-card" key={car.id} onClick={() => { setCategory(car.category); go('mak-fleet') }}><Photo id={car.image} alt="" /><span className="mak-type-shade" /><span className="mak-type-number">0{index + 1}</span><span className="mak-type-label"><span>{car.category}<small>{car.description}</small></span><span className="mak-type-arrow"><Icon name="arrow" size={21} /></span></span></button>)}</div></div></section>

      <section className="mak-section mak-process mak-container" id="mak-process"><SectionHeading eyebrow="SIMPLE BY DESIGN" centered>Less to arrange. <em>More to enjoy.</em></SectionHeading><div className="mak-process-grid">{processSteps.map((item, index) => <article key={item.title} data-reveal style={{ '--mak-delay': `${index * 100}ms` }}><span className="mak-step-number">0{index + 1}</span><span className="mak-step-icon"><Icon name={item.icon} size={27} /></span><h3>{item.title}</h3><p>{item.text}</p></article>)}</div><p className="mak-process-note"><span><Icon name="check" size={14} /></span>New to renting? Start with an enquiry and take it one step at a time.</p></section>

      <section className="mak-business" id="mak-business"><Photo id="photo-1449965408869-eaa3f722e40d" alt="Open-road scenery from a vehicle" /><div className="mak-business-overlay" /><div className="mak-container mak-business-inner"><div data-reveal><span className="mak-eyebrow">BUSINESS MOVES BETTER WITH MAK</span><h2>Your people.<br />Your projects.<br /><em>Our road ahead.</em></h2><p>From a single business trip to an ongoing transport plan, bring your team, destinations and rental requirements together.</p><button type="button" className="mak-button" onClick={() => openEnquiry({ preference: 'Corporate rental' })}>Let's talk business <Icon name="arrow" size={18} /></button></div><div className="mak-business-options" data-reveal style={{ '--mak-delay': '130ms' }}>{[['corporate', 'Corporate accounts', 'Customer-specific quotations and rental requirements.'], ['tracking', 'Multiple destinations', 'Plan pickup points, stops and passenger journeys.'], ['calendar', 'Monthly & project plans', 'Transport shaped around the way your business works.']].map(([icon, title, text]) => <div key={title}><span><Icon name={icon} size={22} /></span><div><h3>{title}</h3><p>{text}</p></div></div>)}</div></div></section>

      <section className="mak-section mak-faq mak-container" id="mak-faq"><div data-reveal><span className="mak-eyebrow">A LITTLE CLARITY</span><h2>Before you<br />hit <em>the road.</em></h2><p>Good journeys begin with the right information. Here are a few helpful things to know.</p><button type="button" className="mak-text-button" onClick={() => openEnquiry()}>Prepare your rental enquiry <Icon name="arrow" size={18} /></button></div><div className="mak-faq-list" data-reveal style={{ '--mak-delay': '100ms' }}>{faqs.map((item, index) => <details key={item.question}><summary><span className="mak-faq-number">0{index + 1}</span><span>{item.question}</span><span className="mak-faq-toggle"><Icon name="plus" size={18} /></span></summary><p>{item.answer}</p></details>)}</div></section>

      <section className="mak-cta"><div className="mak-container"><div data-reveal><span className="mak-eyebrow">THE ROAD IS CALLING</span><h2>Let's make your<br />next move <em>a great one.</em></h2><p>Personal plans or business possibilities. Start your journey with MAK.</p></div><button type="button" className="mak-button" onClick={() => openEnquiry()}>Plan my rental <Icon name="arrow" size={19} /></button></div><span className="mak-cta-watermark" aria-hidden="true">MAK</span></section>
    </main>

    <footer className="mak-footer"><div className="mak-container"><div className="mak-footer-top"><Brand onClick={(event) => { event.preventDefault(); go('mak-home') }} /><p>For everyday journeys.<br />For the road ahead.</p><span><Icon name="tracking" size={17} />Saudi Arabia</span></div><div className="mak-footer-grid"><div><span className="mak-eyebrow">YOUR JOURNEY STARTS HERE</span><h2>A better drive.<br /><em>A little more freedom.</em></h2><button type="button" className="mak-text-button" onClick={() => openEnquiry()}>Prepare an enquiry <Icon name="arrow" size={18} /></button></div><div><h3>Explore MAK</h3>{[['About us', 'mak-about'], ['Rental services', 'mak-services'], ['Our collection', 'mak-fleet'], ['Rental process', 'mak-process'], ['Common questions', 'mak-faq']].map(([label, id]) => <button type="button" key={id} onClick={() => go(id)}>{label}</button>)}</div><div><h3>Your way to travel</h3>{rentalPreferences.map((item) => <button type="button" key={item} onClick={() => openEnquiry({ preference: item })}>{item}</button>)}</div><div><h3>MAK workspace</h3><p>Secure access for our team.</p><a href={login}>{user ? 'Open dashboard' : 'Staff sign in'}<Icon name="arrow" size={16} /></a>{!user && <a href="#/sign-up">Create staff account</a>}<small>New accounts require admin approval.</small></div></div><div className="mak-footer-bottom"><span>&copy; {new Date().getFullYear()} MAK Rentals.</span><span>Public website preview <span aria-hidden="true">&middot;</span> Online reservations coming soon</span><button type="button" onClick={() => go('mak-home')}>Back to top <Icon name="arrow" size={15} /></button></div></div></footer>
    {scrolled && <button type="button" className="mak-back-top" aria-label="Back to top" onClick={() => go('mak-home')}><svg viewBox="0 0 48 48" aria-hidden="true"><circle className="mak-progress-track" cx="24" cy="24" r="21" /><circle className="mak-progress-value" cx="24" cy="24" r="21" pathLength="100" /></svg><Icon name="arrow" size={19} /></button>}
    {enquiry && <RentalEnquiry initial={enquiry} lenisRef={lenis} onClose={closeEnquiry} />}
  </div>
}
