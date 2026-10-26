import {sar} from '../bookings/BookingData.js'
import {chargeReviewError} from './BookingChargeImport.js'
export default function BookingChargeReview({draft,total,onChange}){
  const review=draft.bookingChargeReview
  if(!review?.required)return null
  const difference=Math.round((total-Number(review.bookingTotal))*100)/100
  const problem=chargeReviewError({...draft,bookingChargeReview:{...review,confirmed:true}})
  return <section className="invoice-card" aria-labelledby="booking-charges-heading">
    <h3 id="booking-charges-heading">Review booking charges</h3>
    <p>This booking has no saved quote. Check the rental quantity and rate, add each priced extra below, and enter the tax rate for every line. The booking total already includes any tax; do not add VAT twice.</p>
    {review.recordedExtras&&<p><strong>Recorded extras to price:</strong> {review.recordedExtras}</p>}
    <dl className="invoice-line-breakdown"><div><dt>Saved booking total</dt><dd>{sar(review.bookingTotal)}</dd></div><div><dt>Rental, extras and tax</dt><dd>{sar(total)}</dd></div><div><dt>Difference</dt><dd>{sar(difference)}</dd></div></dl>
    {problem&&<p role="status" className="invoice-help">{problem}</p>}
    <label className="booking-check-field"><input type="checkbox" checked={Boolean(review.confirmed)} disabled={Boolean(problem)} onChange={event=>onChange({...review,confirmed:event.target.checked})}/><span>I have checked the rental quantity, all extra charges and tax rates against the booking total.</span></label>
    <p className="invoice-help">You can save an unfinished draft. Issuing requires a reconciled and confirmed breakdown. Changing a line requires confirmation again.</p>
  </section>
}
