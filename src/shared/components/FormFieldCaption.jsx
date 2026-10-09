import './FormFieldCaption.css'

export default function FormFieldCaption({ children, required = false }) {
  return <span className="form-field-caption">{children}{required && <b className="form-required-marker" aria-hidden="true">*</b>}</span>
}
