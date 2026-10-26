import { vehicleReadiness } from '../lib/rentalPolicy.js'
export default function VehicleReadinessNotice({ vehicle, pricing = false }) {
  if (!vehicle) return null
  const issues=vehicleReadiness(vehicle)
  const foreign=pricing && vehicle.rateCurrency!=='SAR'
  if (!issues.length && !foreign) return null
  return <div className="booking-readiness" role="note">{foreign && <p>Fleet rate is {vehicle.rateCurrency || 'in an unknown currency'}. It has not been copied or converted. Enter the agreed unit price in SAR.</p>}{issues.length>0 && <p><strong>Before handover:</strong> {issues.join('. ')}. You can reserve or assign this vehicle, but cannot start the rental until these issues are resolved.</p>}</div>
}
