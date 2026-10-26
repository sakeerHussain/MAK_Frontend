import {useId,useRef} from 'react'
import useRentalDialog from '../hooks/useRentalDialog.js'
import './RentalDialog.css'

// Render inside the existing permission scope; the hook isolates the background.
export default function RentalDialog({title,titleId,descriptionId,onClose,closeLabel='Close dialog',wide=false,children}){
  const generated=useId(),ref=useRef(null),id=titleId||generated
  useRentalDialog(true,onClose,ref)
  return <div className="booking-overlay"><div ref={ref} className={`booking-dialog${wide?' wide':''}`} role="dialog" aria-modal="true" aria-labelledby={id} aria-describedby={descriptionId} tabIndex={-1}>
    <div className="booking-dialog-heading"><h2 id={id} className="rental-dialog-title" tabIndex={-1} data-dialog-initial-focus>{title}</h2><button type="button" aria-label={closeLabel} onClick={onClose}>×</button></div>
    {children}
  </div></div>
}
