import { useState } from 'react'
import { IconArrowRight, IconDownload } from '@tabler/icons-react'
import './PublicPages.css'

const pages = {
  'our-fleet': { title:'Our Fleet', text:'Find a vehicle for everyday journeys, a longer stay, or business travel. Share your dates and vehicle preferences with MAK.' },
  'about-us': { title:'About Us', text:'MAK Rentals brings personal rentals and business transport together in Saudi Arabia, with quotations shaped around your travel needs.' },
  services: { title:'Services', text:'Explore personal and corporate car rentals, rentals with a driver, airport transfers, fleet leasing, VIP transfers and private transfers.' },
}

function ContactForm() {
  const [prepared, setPrepared] = useState(false)
  const submit = event => {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget))
    const labels = { name:'Full name', email:'Email', phone:'Phone', subject:'Subject', message:'Message' }
    const text = ['MAK RENTALS — CONTACT MESSAGE', 'Prepared locally. This message has not been sent.', '', ...Object.entries(labels).map(([key,label]) => `${label}: ${values[key]?.trim() || 'Not provided'}`)].join('\r\n')
    const url = URL.createObjectURL(new Blob([text], { type:'text/plain;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url; link.download = 'MAK-contact-message.txt'
    document.body.appendChild(link); link.click(); link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setPrepared(true)
  }
  return <section className="rent-container rent-public-page rent-contact-page" aria-labelledby="rent-contact-title">
    <header className="rent-public-page-heading"><h1 id="rent-contact-title">Contact Us</h1><p>Tell us how we can help with your next journey.</p></header>
    <form className="rent-contact-form" onSubmit={submit} onChange={() => setPrepared(false)} aria-label="Contact MAK Rentals">
      <p className="rent-contact-note">Message delivery is not connected in this preview. You can complete the form and download your message.</p>
      <div className="rent-contact-fields">
        <label>Full name <span aria-hidden="true">*</span><input name="name" autoComplete="name" required maxLength={120}/></label>
        <label>Email <span aria-hidden="true">*</span><input name="email" type="email" autoComplete="email" required maxLength={254}/></label>
        <label>Phone <small>Optional</small><input name="phone" type="tel" autoComplete="tel" maxLength={40}/></label>
        <label>Subject <span aria-hidden="true">*</span><select name="subject" required defaultValue=""><option value="" disabled>Select a subject</option><option>Vehicle rental</option><option>Business transport</option><option>Existing enquiry</option><option>General question</option></select></label>
        <label className="rent-contact-wide">Message <span aria-hidden="true">*</span><textarea name="message" rows={6} required maxLength={4000} placeholder="Your dates, destination, or question"/></label>
      </div>
      {prepared && <p className="rent-contact-status" role="status">Your message is ready for download. It has not been sent to MAK.</p>}
      <button type="submit" className="rent-button"><IconDownload size={18} aria-hidden="true"/>Download message</button>
    </form>
  </section>
}

export default function PublicPage({ page }) {
  if (page === 'contact-us') return <ContactForm/>
  const content = pages[page]
  return <section className="rent-container rent-public-page" aria-labelledby="rent-public-title">
    <header className="rent-public-page-heading"><h1 id="rent-public-title">{content.title}</h1><p>{content.text}</p></header>
    <a className="rent-button" href="#/contact-us">Contact Us <IconArrowRight size={18} aria-hidden="true"/></a>
  </section>
}
