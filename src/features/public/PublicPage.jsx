import ServicesPage from './ServicesPage.jsx'
import AboutPage from './AboutPage.jsx'
import ContactPage from './ContactPage.jsx'
import { IconArrowRight } from '@tabler/icons-react'
import './PublicPages.css'

const pages = {
  'our-fleet': { title:'Our Fleet', text:'Find a vehicle for everyday journeys, a longer stay, or business travel. Share your dates and vehicle preferences with MAK.' },
  'about-us': { title:'About Us', text:'MAK Rentals brings personal rentals and business transport together in Saudi Arabia, with quotations shaped around your travel needs.' },
  services: { title:'Services', text:'Explore personal and corporate car rentals, rentals with a driver, airport transfers, fleet leasing, VIP transfers and private transfers.' },
}

export default function PublicPage({ page }) {
  if (page === 'services') return <ServicesPage/>
  if (page === 'about-us') return <AboutPage/>
  if (page === 'contact-us') return <ContactPage/>
  const content = pages[page]
  return <section className="rent-container rent-public-page" aria-labelledby="rent-public-title">
    <header className="rent-public-page-heading"><h1 id="rent-public-title">{content.title}</h1><p>{content.text}</p></header>
    <a className="rent-button" href="#/contact-us">Contact Us <IconArrowRight size={18} aria-hidden="true"/></a>
  </section>
}
