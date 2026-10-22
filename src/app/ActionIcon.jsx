import Icon from './Icon.jsx'

const aliases = { left: 'back', invoice: 'invoices', cancel: 'close' }
const paths = {
  right: 'M9 5l7 7-7 7',
  next: 'M9 5l7 7-7 7',
  assign: 'M4 20v-3a4 4 0 0 1 4-4h5a4 4 0 0 1 4 4v3 M10.5 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M18 7h4 M20 5v4',
  swap: 'M4 7h15 M15 3l4 4-4 4 M20 17H5 M9 13l-4 4 4 4',
}

export default function ActionIcon({ name, size = 16, className = '' }) {
  if (!paths[name]) return <Icon name={aliases[name] || name} size={size} className={className} />
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  )
}
