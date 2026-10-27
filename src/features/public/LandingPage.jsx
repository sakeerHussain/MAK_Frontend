import { useCallback, useEffect, useRef, useState } from 'react'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { IconArrowRight, IconCar, IconCarSuv, IconUsers, IconBriefcase, IconCalendar, IconSearch, IconHeart, IconMenu2, IconX, IconShieldCheck, IconRoute, IconSteeringWheel, IconBuildingAirport } from '@tabler/icons-react'
import RentalEnquiry from './RentalEnquiry.jsx'
import Testimonials from './Testimonials.jsx'
import RentalPlans from './RentalPlans.jsx'
import RentalGuides from './RentalGuides.jsx'
import FeaturedVehicles from './FeaturedVehicles.jsx'
import PublicPage from './PublicPage.jsx'
import FleetPage from './FleetPage.jsx'
import { fleetCategories, locations, rentalPreferences, services } from './LandingData.js'
import './LandingPage.css'
import './RentalsLanding.css'
import './RentalPlans.css'
import './SectionTitles.css'
import './FeaturedControls.css'

const publicNavigation=[['Home','home'],['Our Fleet','our-fleet'],['About Us','about-us'],['Services','services']]
const serviceIcons=[IconBriefcase,IconSteeringWheel,IconBuildingAirport,IconCarSuv,IconShieldCheck,IconRoute]
const vehicleBrands = [
 {id:'toyota',name:'Toyota'}, {id:'honda',name:'Honda'}, {id:'ford',name:'Ford'},
 {id:'bmw',name:'BMW'}, {id:'mercedes',name:'Mercedes-Benz'}, {id:'audi',name:'Audi'},
 {id:'chevrolet',name:'Chevrolet'}, {id:'nissan',name:'Nissan'}, {id:'volkswagen',name:'Volkswagen'},
]
const vehicleBodies = [
 {id:'suv',name:'SUV'}, {id:'sedan',name:'Sedan'}, {id:'truck',name:'Truck'},
 {id:'coupe',name:'Coupe'}, {id:'hatchback',name:'Hatchback'}, {id:'convertible',name:'Convertible'},
]

function Brand({ full = false }) { return <a className="rent-brand" href="#/home" aria-label="MAK Rentals home"><img src={full ? "/images/rentals/mak-international-transparent.webp" : "/images/mak-admin-logo.jpg"} alt={full ? "MAK International" : ""} width={full ? 880 : 1280} height={full ? 161 : 339} />{!full && <span>MAK<span>RENTALS</span></span>}</a> }

export default function LandingPage({user,page='home'}) {
 const lenis=useRef(null), menuButton=useRef(null)
 const [menu,setMenu]=useState(false),[scrolled,setScrolled]=useState(false),[category,setCategory]=useState('All vehicles'),[location,setLocation]=useState('Al Khobar'),[preference,setPreference]=useState('Self-drive'),[pickup,setPickup]=useState(''),[returnDate,setReturnDate]=useState(''),[error,setError]=useState(''),[enquiry,setEnquiry]=useState(null),[saved,setSaved]=useState([]),[savedOnly,setSavedOnly]=useState(false)
 const closeEnquiry=useCallback(()=>setEnquiry(null),[])
 const login=user?'#/dashboard':'#/sign-in'
 const today=new Date().toLocaleDateString('en-CA')
 useEffect(()=>{
  const media=window.matchMedia('(prefers-reduced-motion: reduce)')
  const setup=()=>{lenis.current?.destroy();lenis.current=media.matches?null:new Lenis({autoRaf:true,duration:1.05})}
  const scroll=()=>setScrolled(window.scrollY>24)
  setup();scroll();media.addEventListener('change',setup);window.addEventListener('scroll',scroll,{passive:true})
  return ()=>{lenis.current?.destroy();media.removeEventListener('change',setup);window.removeEventListener('scroll',scroll)}
 },[])
 useEffect(()=>{if(!menu)return;const key=e=>{if(e.key==='Escape'){setMenu(false);menuButton.current?.focus()}};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key)},[menu])
 const go=id=>{setMenu(false);const target=document.getElementById(id);if(!target){if(id==='rent-home'){if(lenis.current)lenis.current.scrollTo(0);else window.scrollTo({top:0,behavior:'instant'})}return;}if(lenis.current)lenis.current.scrollTo(target,{offset:-95});else target.scrollIntoView({behavior:'instant'})}
 const open=(values={})=>{setMenu(false);setEnquiry({category,location,preference,pickup,returnDate,...values})}
 const search=e=>{e.preventDefault();if(pickup&&returnDate&&returnDate<pickup){setError('Return date must be on or after pickup.');return}setError('');setSavedOnly(false);go('rent-collection')}
 return <div className="mak-landing rent-site">
  <a className="mak-skip" href="#rent-main" onClick={e=>{e.preventDefault();document.getElementById('rent-main')?.focus()}}>Skip to content</a>
  <header className={`rent-header ${scrolled||page!=='home'?'is-scrolled':''} ${menu?'is-open':''}`}><div className="rent-container rent-header-inner"><Brand full /><nav id="rent-navigation" aria-label="Main navigation" className={menu?'is-open':''}>{publicNavigation.map(([name,route])=><a key={route} href={`#/${route}`} aria-current={page===route?'page':undefined} onClick={()=>setMenu(false)}>{name}</a>)}<a className="rent-mobile-contact" href="#/contact-us" aria-current={page==='contact-us'?'page':undefined} onClick={()=>setMenu(false)}>Contact Us</a></nav><div className="rent-header-actions"><button className="rent-icon" type="button" aria-label={`Saved vehicles, ${saved.length}`} aria-pressed={savedOnly} onClick={()=>{if(page==='our-fleet'){setSavedOnly(v=>!v);return}if(page!=='home'){window.location.hash='/home';return}setSavedOnly(v=>!v);go('rent-collection')}}><IconHeart size={21} />{saved.length>0&&<small>{saved.length}</small>}</button><a className="rent-login" href={login}>{user?'Dashboard':'Sign in'}</a><a className="rent-button rent-nav-cta" href="#/contact-us" aria-current={page==='contact-us'?'page':undefined}>Contact Us</a><button ref={menuButton} className="rent-icon rent-menu" aria-label={menu?'Close navigation':'Open navigation'} aria-expanded={menu} aria-controls="rent-navigation" type="button" onClick={()=>setMenu(v=>!v)}>{menu?<IconX />:<IconMenu2 />}</button></div></div></header>
  <main id="rent-main" tabIndex={-1}>
   {page==='home'?<>
   <section className="rent-hero" id="rent-home"><picture className="rent-hero-art"><source media="(max-width:650px)" srcSet="/images/rentals/hero-clear-900.webp" /><img src="/images/rentals/hero-clear-1800.webp" width="1774" height="887" alt="Blue executive sedan with two premium white vehicles against a Saudi city skyline" fetchPriority="high" /></picture><div className="rent-container rent-hero-inner"><div className="rent-hero-copy"><span className="rent-eyebrow">YOUR JOURNEY. OUR DRIVE.</span><h1>Find your perfect car.<br />Drive your <em>own story.</em></h1><p>Everyday freedom. Exceptional arrivals. Discover car rentals for wherever life takes you.</p><div className="rent-actions"><button type="button" className="rent-button" onClick={()=>go('rent-collection')}>Explore the fleet <IconArrowRight size={17}/></button><button type="button" className="rent-button rent-outline" onClick={()=>open({preference:'Corporate rental'})}>For your business</button></div><div className="rent-hero-benefits">{[[IconCar,'Your kind of car','Sedan, SUV & premium'],[IconUsers,'Your way to travel','Self-drive or with a driver'],[IconCalendar,'Your kind of plan','Daily & monthly enquiries']].map(([Symbol,title,text])=><div key={title}><Symbol size={25} stroke={1.5}/><span><strong>{title}</strong><small>{text}</small></span></div>)}</div></div></div></section>
   <div className="rent-container"><form className="rent-finder" onSubmit={search} aria-labelledby="rent-finder-title"><div className="rent-finder-heading"><h2 id="rent-finder-title">Find your next drive</h2></div><div className="rent-finder-fields"><label>Vehicle category<select value={category} onChange={e=>setCategory(e.target.value)}>{fleetCategories.map(v=><option key={v}>{v}</option>)}</select></label><label>Rental preference<select value={preference} onChange={e=>setPreference(e.target.value)}>{rentalPreferences.map(v=><option key={v}>{v}</option>)}</select></label><label>Pickup location<select value={location} onChange={e=>setLocation(e.target.value)}>{locations.map(v=><option key={v}>{v}</option>)}</select></label><label>Pickup date<input type="date" min={today} value={pickup} onChange={e=>setPickup(e.target.value)}/></label><label>Return date<input type="date" min={pickup||today} value={returnDate} onChange={e=>setReturnDate(e.target.value)}/></label><button className="rent-button" type="submit"><IconSearch size={17}/> Explore cars</button></div>{error&&<p className="rent-error" role="alert">{error}</p>}</form></div>
   <FeaturedVehicles category={category} setCategory={setCategory} saved={saved} setSaved={setSaved} savedOnly={savedOnly} setSavedOnly={setSavedOnly} onEnquire={open}/>
   <section className="rent-container rent-browse rent-browse-directory" aria-label="Browse vehicles">
    <div className="rent-brands-panel"><h2>Browse by Brand</h2><div className="rent-brand-grid">{vehicleBrands.map(brand=><button type="button" key={brand.id} aria-label={`Enquire about ${brand.name}`} onClick={()=>open({notes:`Preferred vehicle brand: ${brand.name}.`})}><span className="rent-brand-emblem"><img src={`/images/rentals/brands/${brand.id}.png`} alt="" width="192" height="192" loading="lazy" decoding="async" /></span><span>{brand.name}</span></button>)}</div></div>
    <div className="rent-category-panel"><h2>Browse by Category</h2><div className="rent-body-grid">{vehicleBodies.map(body=><button type="button" key={body.id} onClick={()=>{if(fleetCategories.includes(body.name)){setCategory(body.name);setSavedOnly(false);go('rent-collection')}else{open({category:'All vehicles',notes:`Preferred vehicle category: ${body.name}. Please confirm availability.`})}}}><img src={`/images/rentals/categories/${body.id}.png`} alt="" width="256" height="160" loading="lazy" decoding="async" /><span>{body.name}</span></button>)}</div><button className="rent-white-link" type="button" onClick={()=>{setCategory('All vehicles');setSavedOnly(false);go('rent-collection')}}>View all categories</button></div>
   </section>
   <section className="rent-container rent-section" id="rent-services"><div className="rent-section-head rent-uniform-heading"><div><h2 className="rent-section-title">Wherever you’re headed.</h2></div></div><div className="rent-services">{services.map((service,i)=>{const Symbol=serviceIcons[i];return <button type="button" key={service.title} onClick={()=>open({preference:service.preference})}><span className="rent-service-icon" aria-hidden="true"><Symbol size={20} stroke={1.5}/></span><span className="rent-service-copy"><h3>{service.title}</h3><p>{service.description}</p></span></button>})}</div></section>
   <RentalPlans onEnquire={open} />
   <Testimonials />
   <section className="rent-container rent-rental-cta" id="rent-plan" aria-labelledby="rent-plan-title"><div className="rent-business rent-consultation"><picture><source media="(max-width:650px)" srcSet="/images/rentals/rental-consultation-mobile.webp"/><img src="/images/rentals/rental-consultation-desktop.webp" alt="Travellers discussing their rental plans with a car rental advisor" width="1400" height="640" loading="lazy" decoding="async"/></picture><div><span className="rent-eyebrow">CAR RENTAL, MADE SIMPLE</span><h2 id="rent-plan-title">Your next drive starts here.</h2><p>From daily drives to monthly rentals, find a plan that fits. Share your dates and travel needs for a tailored rental quote.</p><button className="rent-button rent-white" type="button" onClick={()=>open()}>Get a rental quote</button></div></div></section>
   <RentalGuides lenisRef={lenis} />
   </>:page==='our-fleet'?<FleetPage saved={saved} setSaved={setSaved} savedOnly={savedOnly} setSavedOnly={setSavedOnly} onEnquire={open}/>:<PublicPage page={page}/>}
  </main>
  <footer className="rent-footer"><div className="rent-container"><div className="rent-footer-grid"><div><Brand full /><p>For everyday freedom.<br />For exceptional arrivals.<br />For the road ahead.</p></div><div><h3>Explore MAK</h3>{[...publicNavigation,['Contact Us','contact-us']].map(([label,route])=><a key={route} href={`#/${route}`}>{label}</a>)}</div><div><h3>Your way to travel</h3>{rentalPreferences.map(v=><button type="button" key={v} onClick={()=>open({preference:v})}>{v}</button>)}</div><div><h3>Need a little help?</h3><button type="button" onClick={()=>open()}>Prepare an enquiry</button><a href={login}>{user?'Open dashboard':'Staff sign in'}</a>{!user&&<a href="#/sign-up">Create staff account</a>}</div></div><div className="rent-footer-bottom"><span>© {new Date().getFullYear()} MAK Rentals.</span><span>Public preview · Enquiries download locally; no online reservations.</span><button type="button" onClick={()=>go('rent-home')}>Back to top <IconArrowRight size={15}/></button></div></div></footer>
  {enquiry&&<RentalEnquiry initial={enquiry} lenisRef={lenis} onClose={closeEnquiry}/>}
 </div>
}
