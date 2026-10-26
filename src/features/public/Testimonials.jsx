import { useState } from 'react'
import { IconChevronLeft, IconChevronRight, IconStarFilled } from '@tabler/icons-react'

const sampleReviews = [
  { id: 'business', name: 'Business traveller', location: 'Riyadh, Saudi Arabia', image: 'traveller-1.webp', quote: 'Transport that fits a busy schedule makes all the difference. Clear pickup details and a comfortable journey, from start to finish.' },
  { id: 'airport', name: 'Airport traveller', location: 'Dammam, Saudi Arabia', image: 'traveller-2.webp', quote: 'An easy arrival after a long flight. Having the pickup planned in advance leaves more time to enjoy the journey ahead.' },
  { id: 'monthly', name: 'Monthly rental customer', location: 'Al Khobar, Saudi Arabia', image: 'traveller-3.webp', quote: 'A rental plan shaped around everyday life. The flexibility of a longer stay makes getting around feel simple.' },
]

export default function Testimonials() {
  const [first, setFirst] = useState(0)
  const move = direction => setFirst(current => (current + direction + sampleReviews.length) % sampleReviews.length)

  return <section id="rent-about" className="rent-testimonials" aria-labelledby="rent-testimonials-title" aria-roledescription="carousel">
    <div className="rent-container">
      <header className="rent-uniform-heading"><h2 className="rent-section-title" id="rent-testimonials-title">What Our Customers Say</h2></header>
      <div className="rent-review-carousel">
        <button className="rent-review-arrow" type="button" onClick={() => move(-1)} aria-label="Previous testimonials"><IconChevronLeft size={18} stroke={1.5} /></button>
        <div className="rent-review-cards" key={first}>
          {sampleReviews.map((_, offset) => {
            const review = sampleReviews[(first + offset) % sampleReviews.length]
            return <article className="rent-review" key={review.id} aria-label={`Sample review from ${review.name.toLowerCase()}`}>
              <span className="rent-review-sample">Sample review</span>
              <div className="rent-review-stars" role="img" aria-label="Sample rating: 5 out of 5 stars">{Array.from({ length: 5 }, (_, i) => <IconStarFilled key={i} size={13} aria-hidden="true" />)}</div>
              <blockquote>“{review.quote}”</blockquote>
              <div className="rent-review-person"><img src={`/images/rentals/testimonials/${review.image}`} alt="" width="128" height="128" loading="lazy" decoding="async" /><div><h3>{review.name}</h3><p>{review.location}</p></div></div>
            </article>
          })}
        </div>
        <button className="rent-review-arrow" type="button" onClick={() => move(1)} aria-label="Next testimonials"><IconChevronRight size={18} stroke={1.5} /></button>
      </div>
      <span className="rent-sr-only" role="status">Showing sample testimonials starting with {sampleReviews[first].name.toLowerCase()}.</span>
    </div>
  </section>
}
