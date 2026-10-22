import './AdminPageHeader.css'

export default function AdminPageHeader({ title, description }) {
  return (
    <header className="admin-page-heading" aria-labelledby="admin-page-title">
      <span className="admin-page-eyebrow">RENTAL OPERATIONS</span>
      <h1 id="admin-page-title">{title}</h1>
      <p>{description}</p>
    </header>
  )
}
