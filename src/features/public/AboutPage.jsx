import { IconArrowRight } from '@tabler/icons-react'
import './AboutPage.css'

const services = ['Passenger transport', 'Corporate & workforce', 'Project logistics']

export default function AboutPage() {
  return <article className="rent-about-page" aria-labelledby="rent-about-title">
    <section className="rent-about-hero">
      <div className="rent-about-hero-copy">
        <p className="rent-about-label">About MAK International</p>
        <h1 id="rent-about-title">Every journey<br/>begins with<br/>people.</h1>
        <p className="rent-about-lead">From Al Khobar, we connect people, businesses and projects across Saudi Arabia and the GCC.</p>
        <p className="rent-about-founded">Established 2012</p>
      </div>
      <img className="rent-about-hero-photo" src="/images/about/mak-coast-window.webp" width="900" height="900" alt="A coastal road seen through a passenger window" fetchPriority="high"/>
    </section>
    <div className="rent-about-editorial">
      <section className="rent-about-story" aria-labelledby="rent-about-story-title">
        <div><p className="rent-about-label">Our story</p><h2 id="rent-about-story-title">Built around<br/>the way you move.</h2></div>
        <p>Established in 2012, MAK International combines passenger transportation, corporate mobility and industrial logistics. Our approach centres on safety, punctuality, professionalism and clear communication.</p>
      </section>
      <section className="rent-about-approach" aria-labelledby="rent-about-approach-title">
        <img src="/images/about/mak-coach-road.webp" width="800" height="900" alt="A passenger coach travelling through a mountain landscape" loading="lazy"/>
        <div className="rent-about-approach-copy">
          <p className="rent-about-label">Our approach</p>
          <h2 id="rent-about-approach-title">From individual<br/>arrivals to entire<br/>teams.</h2>
          <p>Whether you’re welcoming a single traveller, moving a corporate team or supporting a large-scale project, we bring transport services together around your needs across Saudi Arabia and the GCC.</p>
          <ul className="rent-about-services">{services.map(service => <li key={service}><a href="#/services">{service}<IconArrowRight size={20} aria-hidden="true"/></a></li>)}</ul>
        </div>
      </section>
    </div>
    <section className="rent-about-contact" aria-labelledby="rent-about-contact-title">
      <img src="/images/about/mak-mountain-road.webp" width="1440" height="400" alt="" loading="lazy"/>
      <div><h2 id="rent-about-contact-title">Let’s talk about<br/>your next journey.</h2><a className="rent-button" href="#/contact-us">Contact Us <IconArrowRight size={19} aria-hidden="true"/></a></div>
    </section>
  </article>
}
