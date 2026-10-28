import { useState } from 'react'
import { IconArrowRight } from '@tabler/icons-react'
import './ServicesPage.css'

// Catalogue and vehicle references: https://www.makissco.com/services
const passengerServices = [
  { title:'Chauffeur services', description:'Executive chauffeur service with professional drivers for corporate and private travel.', vehicles:'Mercedes-Benz S-Class' },
  { title:'Business trips', description:'Business travel across Saudi Arabia and the GCC with dedicated SUV support.', vehicles:'Nissan Patrol' },
  { title:'VIP transportation', description:'Transport for executives and guests with spacious luxury SUVs.', vehicles:'GMC Yukon XL' },
  { title:'Airport transfers', description:'Meet-and-greet airport transfers with passenger vans for individuals and groups, with flight coordination.', vehicles:'Toyota Granvia / Hyundai Staria' },
  { title:'City transfers', description:'City-to-city and local transfers with sedans for everyday travel needs.', vehicles:'Toyota Camry / Corolla / Hyundai Accent / Nissan Altima' },
  { title:'Event transport', description:'Transport for guests, conferences and private functions with premium vehicles.', vehicles:'BMW / Audi' },
]
const workforceServices = [
  { title:'Oil & gas and rig transportation', description:'Staff and crew transport for oil and gas operations, with shift support.', vehicles:'Toyota Hiace / Coaster' },
  { title:'Aramco rigs and site', description:'Site and rig transportation supporting Aramco operations.', vehicles:'Toyota Land Cruiser / Prado' },
  { title:'Buses', description:'Group and staff transport with passenger coaches.', vehicles:'Mercedes-Benz / Ashok Leyland' },
]
const cargoServices = [
  { title:'Tools & equipment', description:'Pickup transport for tools and equipment across project and industrial sites.', vehicles:'Toyota Hilux / Isuzu D-Max' },
  { title:'General cargo', description:'Light and medium cargo transport.', vehicles:'Dyna trucks — 3, 5 and 8 tons' },
  { title:'Logistics', description:'Cargo and heavy transport for project logistics.', vehicles:'Lowbed and flatbed trailers' },
]

export default function ServicesPage() {
  const [selected, setSelected] = useState(0)
  const service = passengerServices[selected]
  return <div className="rent-services-page">
    <section className="mak-services-hero" aria-labelledby="mak-services-title">
      <img src="/images/services/mak-chauffeur.webp" alt="Mercedes-Benz S-Class at a city hotel" fetchPriority="high"/>
      <div className="mak-services-hero-content">
        <h1 id="mak-services-title">Transportation<br/>services.</h1>
        <p>Passenger, corporate, industrial<br className="mak-services-desktop-break"/> and logistics transportation.</p>
        <span className="mak-services-region">Saudi Arabia &amp; GCC</span>
      </div>
    </section>
    <div className="mak-services-editorial">
      <section className="mak-services-passenger" aria-labelledby="mak-passenger-title">
        <h2 className="mak-services-section-label" id="mak-passenger-title">Passenger travel</h2>
        <div className="mak-services-passenger-layout">
          <img className="mak-services-photo" src="/images/services/mak-chauffeur.webp" alt="Mercedes-Benz S-Class, featured on MAK’s chauffeur service catalogue" loading="lazy"/>
          <div className="mak-services-passenger-copy">
            <div className="mak-services-selected" id="mak-passenger-description" aria-live="polite" aria-atomic="true">
              <h3>{service.title}</h3><p>{service.description}</p><p className="mak-services-models">{service.vehicles}</p>
            </div>
            <div className="mak-services-selector" role="group" aria-label="Passenger services">
              {passengerServices.map((item, index) => <button key={item.title} type="button" aria-pressed={selected === index} aria-controls="mak-passenger-description" onClick={() => setSelected(index)}>{item.title}<IconArrowRight size={18} aria-hidden="true"/></button>)}
            </div>
          </div>
        </div>
      </section>
      <section className="mak-services-workforce" aria-labelledby="mak-workforce-title">
        <p className="mak-services-section-label">Workforce &amp; site transport</p>
        <div className="mak-services-workforce-layout">
          <div><h2 id="mak-workforce-title">Workforce &amp;<br/>site transport</h2>
            <dl className="mak-services-workforce-list">{workforceServices.map(item => <div key={item.title}><dt>{item.title}</dt><dd>{item.vehicles}</dd></div>)}</dl>
          </div>
          <img className="mak-services-photo" src="/images/services/mak-buses.webp" alt="Mercedes-Benz and Ashok Leyland passenger coaches from MAK’s service catalogue" loading="lazy"/>
        </div>
      </section>
      <section className="mak-services-cargo" aria-labelledby="mak-cargo-title">
        <p className="mak-services-section-label">Cargo &amp; project logistics</p>
        <h2 id="mak-cargo-title">Cargo &amp; project logistics</h2>
        <div className="mak-services-cargo-list">{cargoServices.map(item => <article key={item.title}><h3>{item.title}</h3><p>{item.vehicles}</p><p className="mak-services-cargo-description">{item.description}</p></article>)}</div>
      </section>
      <section className="mak-services-contact" aria-labelledby="mak-services-contact-title"><div><h2 id="mak-services-contact-title">Get in touch</h2><p>Contact us to discuss your transportation requirements.</p></div><a className="rent-button" href="#/contact-us">Contact Us <IconArrowRight size={18} aria-hidden="true"/></a></section>
    </div>
  </div>
}
