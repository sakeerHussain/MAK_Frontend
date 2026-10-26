import { IconArrowRight, IconCalendar, IconUsers } from '@tabler/icons-react'

const plans = [
  {
    id: 'daily', title: 'Daily rentals', description: 'Make the most of every day.',
    ideal: 'Short visits & weekend trips', details: 'Your dates & pickup location',
    preference: 'Self-drive', note: 'Interested in the daily rental plan.',
    alt: 'Illustrative silver sedan on a palm-lined city road',
  },
  {
    id: 'monthly', title: 'Monthly rentals', description: 'Settle into your everyday routine.',
    ideal: 'Longer stays & everyday travel', details: 'Your preferred rental period',
    preference: 'Monthly rental', note: 'Interested in the monthly rental plan.',
    alt: 'Illustrative white SUV outside a modern residence',
  },
  {
    id: 'business', title: 'Business rentals', description: 'Keep your people moving.',
    ideal: 'Employee travel & projects', details: 'Your team & transport needs',
    preference: 'Corporate rental', note: 'Interested in the business rental plan.',
    alt: 'Illustrative black executive sedan in a business district',
  },
]

export default function RentalPlans({ onEnquire }) {
  return <section className="rent-container rent-rental-plans" id="rent-rental-plans" aria-labelledby="rent-rental-plans-title">
    <header className="rent-rental-plans-heading rent-uniform-heading">
      <h2 className="rent-section-title" id="rent-rental-plans-title">Choose your rental plan</h2>
      <p>A short trip, a longer stay, or a plan for your business.</p>
    </header>
    <div className="rent-plan-cards">
      {plans.map(plan => <article className="rent-plan-card" key={plan.id} aria-labelledby={`rent-${plan.id}-title`}>
        <img className="rent-plan-photo" src={`/images/rentals/plans/${plan.id}.webp`} alt={plan.alt} width="1000" height="600" loading="lazy" decoding="async"/>
        <div className="rent-plan-copy">
          <h3 id={`rent-${plan.id}-title`}>{plan.title}</h3>
          <p className="rent-plan-description">{plan.description}</p>
          <dl className="rent-plan-details">
            <div><IconUsers size={25} stroke={1.6} aria-hidden="true"/><div><dt>Ideal for</dt><dd>{plan.ideal}</dd></div></div>
            <div><IconCalendar size={25} stroke={1.6} aria-hidden="true"/><div><dt>Tell us</dt><dd>{plan.details}</dd></div></div>
          </dl>
          <button type="button" className="rent-button" aria-label={`Enquire about ${plan.title.toLowerCase()}`} onClick={() => onEnquire({ preference: plan.preference, notes: plan.note })}>Enquire about this plan <IconArrowRight size={18} aria-hidden="true"/></button>
        </div>
      </article>)}
    </div>
  </section>
}
