import RentalDialog from '../../shared/components/RentalDialog.jsx'
import BillingProfileEditor from './BillingProfileEditor.jsx'
export default function BillingProfileDialog({onSaved,onClose}){
  return <RentalDialog title="MAK Billing Profile" titleId="mak-profile-title" wide onClose={onClose} closeLabel="Close MAK billing profile"><BillingProfileEditor onSaved={onSaved} onCancel={onClose}/></RentalDialog>
}
