import process from 'node:process'
import assert from 'node:assert/strict'
import { rentalDate, rentalDay, rentalDateTime, formatRentalDateTime } from '../src/shared/lib/rentalTime.js'
import { vehicleRateForUnit, vehicleReadiness, paymentChoices } from '../src/shared/lib/rentalPolicy.js'
import { periodBounds, isOverdue } from '../src/features/bookings/BookingData.js'
import { blankVehicle } from '../src/features/fleet/FleetData.js'
import { vehiclePayload } from '../src/features/fleet/FleetApi.js'
import { templateCsv } from '../src/features/fleet/FleetImport.js'
assert.equal(vehicleRateForUnit({rateCurrency:'USD',dailyRate:100},'Day'),'')
assert.equal(vehicleRateForUnit({dailyRate:100},'Day'),'')
assert.equal(vehicleRateForUnit({rateCurrency:'SAR',dailyRate:100},'Day'),100)
assert.equal(blankVehicle().rateCurrency,'SAR')
assert.equal(vehiclePayload({year:2026,seats:5,dailyRate:100}).rateCurrency,'SAR')
assert.equal(vehiclePayload({rateCurrency:'USD',year:2026,seats:5,dailyRate:100}).rateCurrency,'USD')
assert.match(templateCsv(),/Daily Rate \(SAR\)/)
const instant=new Date('2026-10-25T22:30:00Z')
assert.equal(rentalDay(instant),'2026-10-26')
assert.equal(rentalDateTime(instant),'2026-10-26T01:30')
assert.equal(rentalDate('2026-10-26T01:30').toISOString(),'2026-10-25T22:30:00.000Z')
assert.equal(rentalDateTime(rentalDate('2026-10-26T01:30')),'2026-10-26T01:30')
assert.match(formatRentalDateTime('2026-10-25T22:30:00Z'),/26 Oct 2026.*01:30.*KSA/)
assert.equal(periodBounds('This month','','',new Date('2026-10-31T22:00Z')).start,'2026-11-01')
assert.equal(periodBounds('Last month','','',new Date('2026-10-31T22:00Z')).end,'2026-10-31')
assert.equal(isOverdue({status:'Active',returnAt:'2026-10-26T01:29'},instant),true)
const ready={status:'Available',onSite:true,documentRecords:['Istimara','Insurance','Fahas'].map(type=>({type,name:type+'.pdf',expiryDate:'2026-10-26'}))}
assert.deepEqual(vehicleReadiness(ready,instant),[])
assert.match(vehicleReadiness({...ready,onSite:false},instant).join(' '),/off-site/)
assert.ok(vehicleReadiness({...ready,documentRecords:ready.documentRecords.slice(1)},instant).length)
assert.ok(vehicleReadiness({...ready,documentRecords:ready.documentRecords.map(d=>({...d,expiryDate:'2026-10-25'}))},instant).length)
assert.ok(vehicleReadiness({...ready,documentRecords:ready.documentRecords.map(d=>({...d,expiryDate:''}))},instant).length)
assert.deepEqual(paymentChoices({status:'Cancelled',receivedAmount:500,refundedAmount:100}),{cancelled:true,defaultKind:'Refund',refundable:400})
assert.equal(paymentChoices({status:'Cancelled',receivedAmount:500,refundedAmount:500}).refundable,0)
assert.equal(paymentChoices({status:'Confirmed'}).defaultKind,'Payment')
console.log('Rental safety and KSA regressions passed; host TZ='+process.env.TZ)
