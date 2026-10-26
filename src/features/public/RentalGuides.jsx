import { useCallback, useEffect, useRef, useState } from 'react'
import { IconArrowRight, IconBriefcase, IconCalendar, IconLuggage, IconX } from '@tabler/icons-react'
import './RentalGuides.css'

const guides = [
  {
    id: 'airport', title: 'Airport pickups', icon: IconLuggage,
    summary: 'Confirm your arrival time and meeting point.',
    introduction: 'A few details shared ahead of time can make your arrival easier to coordinate.',
    tips: [
      ['Share your arrival details', 'Include your airport, terminal, flight number and expected arrival time in your enquiry. Allow time for baggage collection when suggesting a pickup time.'],
      ['Plan for your passengers and bags', 'Tell the team how many people are travelling and how much luggage you expect to bring, so a suitable vehicle can be discussed.'],
      ['Agree where to meet', 'Confirm the meeting point and contact arrangements with the rental team before travelling. Let them know if your arrival plans change.'],
    ],
  },
  {
    id: 'monthly', title: 'Monthly rentals', icon: IconCalendar,
    summary: 'Plan your dates around your daily routine.',
    introduction: 'Start with the journeys you expect to make and the period you need a vehicle for.',
    tips: [
      ['Outline your rental period', 'Share your preferred start and return dates. If your plans may change, mention this when requesting a quote.'],
      ['Think about everyday journeys', 'Describe your usual destinations, passenger numbers and vehicle preferences. Mention whether you would like to drive yourself or discuss a driver.'],
      ['Review the quotation', 'Confirm the final rate, included services, rental terms and pickup and return arrangements with the team before agreeing to the rental.'],
    ],
  },
  {
    id: 'business', title: 'Business travel', icon: IconBriefcase,
    summary: 'Coordinate pickup points and team needs.',
    introduction: 'Bring your team’s travel requirements together before requesting a business rental quote.',
    tips: [
      ['Bring the itinerary together', 'List the travel dates, pickup locations, destinations and approximate passenger numbers for your team.'],
      ['Describe the transport you need', 'Mention the number of vehicles you have in mind, any luggage needs and whether you would like a driver. Highlight recurring journeys or project travel.'],
      ['Choose a point of contact', 'Identify who will coordinate the enquiry and any changes. Confirm vehicle availability, the quotation and travel arrangements with the rental team.'],
    ],
  },
]

function GuideDialog({ guide, lenisRef, onClose }) {
  const dialog = useRef(null)
  useEffect(() => {
    const opener = document.activeElement
    const previousOverflow = document.body.style.overflow
    const lenis = lenisRef.current
    const element = dialog.current
    document.body.style.overflow = 'hidden'
    lenis?.stop()
    element.showModal()
    return () => {
      element.close()
      document.body.style.overflow = previousOverflow
      lenis?.start()
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true })
    }
  }, [lenisRef])
  return <dialog ref={dialog} className="rent-guide-dialog" aria-labelledby="rent-guide-dialog-title" aria-describedby="rent-guide-introduction" onKeyDown={event => {
      if (event.key !== 'Tab') return
      const controls = [...dialog.current.querySelectorAll('button')]
      const first = controls[0], last = controls.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }} onCancel={event => { event.preventDefault(); onClose() }} data-lenis-prevent>
    <header className="rent-guide-dialog-heading"><div><span className="rent-eyebrow">RENTAL GUIDES</span><h2 id="rent-guide-dialog-title">{guide.title}</h2></div><button type="button" className="rent-guide-close" aria-label="Close rental guide" onClick={onClose}><IconX size={21}/></button></header>
    <p id="rent-guide-introduction">{guide.introduction}</p>
    <ol className="rent-guide-tips">{guide.tips.map(([title, text]) => <li key={title}><h3>{title}</h3><p>{text}</p></li>)}</ol>
    <div className="rent-guide-dialog-footer"><button className="rent-button" type="button" onClick={onClose}>Done reading</button></div>
  </dialog>
}

export default function RentalGuides({ lenisRef }) {
  const [selected, setSelected] = useState(null)
  const close = useCallback(() => setSelected(null), [])
  return <>
    <section id="rent-guides" className="rent-container rent-guides" aria-labelledby="rent-guides-title">
      <div className="rent-guides-intro"><h2 className="rent-section-title" id="rent-guides-title">Before your next drive.</h2><p>A few helpful pointers for planning ahead.</p></div>
      <div className="rent-guide-columns">{guides.map(guide => {
        const Symbol = guide.icon
        return <article className="rent-guide-topic" key={guide.id} aria-labelledby={`rent-guide-${guide.id}`}>
          <span className="rent-guide-icon" aria-hidden="true"><Symbol size={31} stroke={1.6}/></span>
          <h3 id={`rent-guide-${guide.id}`}>{guide.title}</h3><p>{guide.summary}</p>
          <button type="button" className="rent-link" aria-label={`Read guide: ${guide.title}`} onClick={() => setSelected(guide)}>Read guide <IconArrowRight size={18} aria-hidden="true"/></button>
        </article>
      })}</div>
    </section>
    {selected && <GuideDialog guide={selected} lenisRef={lenisRef} onClose={close}/>}
  </>
}
