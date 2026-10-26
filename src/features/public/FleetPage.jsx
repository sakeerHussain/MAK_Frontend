import { useState } from 'react'
import { IconSearch, IconHeart, IconUsers, IconSettings, IconGasStation, IconArrowRight } from '@tabler/icons-react'
import { vehicles } from './FleetData.js'
import './FleetPage.css'

export default function FleetPage({ saved, setSaved, savedOnly, setSavedOnly, onEnquire }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All categories')
  const [brand, setBrand] = useState('All brands')
  const [rate, setRate] = useState('any')
  const [sort, setSort] = useState('recommended')
  const reset = () => { setQuery(''); setCategory('All categories'); setBrand('All brands'); setRate('any'); setSavedOnly(false) }
  const cars = vehicles.filter(car => car.name.toLowerCase().includes(query.trim().toLowerCase()) && (category === 'All categories' || car.category === category) && (brand === 'All brands' || car.brand === brand) && (rate === 'any' || (rate === 'under250' ? car.rate < 250 : car.rate >= 250)) && (!savedOnly || saved.includes(car.id)))
  if (sort === 'low') cars.sort((a,b) => a.rate-b.rate)
  if (sort === 'high') cars.sort((a,b) => b.rate-a.rate)
  if (sort === 'name') cars.sort((a,b) => a.name.localeCompare(b.name))
  const filtered = query || category !== 'All categories' || brand !== 'All brands' || rate !== 'any' || savedOnly
  return <section className="rent-container fleet-page" aria-labelledby="fleet-title">
    <header className="fleet-heading"><h1 id="fleet-title">Our Fleet</h1><p>A car for every kind of journey.</p></header>
    <form className="fleet-filters" role="search" aria-label="Find a rental vehicle" onSubmit={event => event.preventDefault()}>
      <label className="fleet-search"><span className="rent-sr-only">Search by vehicle name</span><IconSearch size={19} aria-hidden="true"/><input type="search" placeholder="Search by vehicle name" value={query} onChange={event => setQuery(event.target.value)}/></label>
      <label><span className="rent-sr-only">Vehicle category</span><select value={category} onChange={event => setCategory(event.target.value)}><option>All categories</option><option>Sedan</option><option>SUV</option><option>Premium</option></select></label>
      <label><span className="rent-sr-only">Vehicle brand</span><select value={brand} onChange={event => setBrand(event.target.value)}><option>All brands</option>{vehicles.map(car => <option key={car.brand}>{car.brand}</option>)}</select></label>
      <label><span className="rent-sr-only">Daily rate</span><select value={rate} onChange={event => setRate(event.target.value)}><option value="any">Daily rate (Any)</option><option value="under250">Under SAR 250</option><option value="over250">SAR 250 and above</option></select></label>
      <label><span className="rent-sr-only">Sort vehicles</span><select value={sort} onChange={event => setSort(event.target.value)}><option value="recommended">Sort by</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option><option value="name">Name: A–Z</option></select></label>
    </form>
    <div className="fleet-results"><p role="status" aria-live="polite">{cars.length} {cars.length === 1 ? 'vehicle' : 'vehicles'}{savedOnly ? ' saved' : ''}</p>{filtered && <button type="button" onClick={reset}>Clear filters</button>}</div>
    <div className="fleet-grid">{cars.map(car => <article className="fleet-card" key={car.id} aria-label={car.name}>
      <div className="fleet-photo"><img src={`/images/rentals/featured/${car.id}.webp`} alt={`${car.name}, illustrative rental vehicle`} width="800" height="600" loading="eager" decoding="async"/><button type="button" className={`fleet-save ${saved.includes(car.id) ? 'is-saved' : ''}`} aria-label={`Save ${car.name}`} aria-pressed={saved.includes(car.id)} onClick={() => setSaved(current => current.includes(car.id) ? current.filter(id => id !== car.id) : [...current, car.id])}><IconHeart size={21}/></button></div>
      <div className="fleet-card-copy"><h2>{car.name}</h2><p>{car.description}</p><div className="fleet-specs"><span><IconUsers size={17} aria-hidden="true"/>5 seats</span><span><IconSettings size={17} aria-hidden="true"/>Automatic</span><span><IconGasStation size={17} aria-hidden="true"/>Petrol</span></div>
      <div className="fleet-card-bottom"><div className="fleet-price"><div><strong>SAR {car.rate}</strong><span> / day</span></div><small>Sample rate</small></div><button type="button" className="rent-button" aria-label={`Enquire about ${car.name}`} onClick={() => onEnquire({category:car.category,preference:'Self-drive',notes:`Preferred vehicle: ${car.name}. Sample rental rate: SAR ${car.rate} per day (demo only). Please confirm availability and final quotation.`})}>Enquire now <IconArrowRight size={17} aria-hidden="true"/></button></div></div>
    </article>)}</div>
    {!cars.length && <div className="fleet-empty"><IconSearch size={30} aria-hidden="true"/><h2>No vehicles match your search</h2><p>Try another vehicle name or adjust your filters.</p><button type="button" className="rent-button" onClick={reset}>Show all vehicles</button></div>}
  </section>
}
