const iconPaths = {
  mail: 'M3 5h18v14H3z M3 5l9 7 9-7',
  dashboard: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  fleet: 'M3 7h11v9H3z M14 10h4l3 3v3h-7z M7 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z M18 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  driver: 'M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21a8 8 0 0 1 16 0 M8 3h8',
  employee: 'M16 20v-1.5a4.5 4.5 0 0 0-9 0V20 M11.5 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M18 7a3 3 0 0 1 0 6 M20 20v-1a4 4 0 0 0-2-3.5',
  vendor: 'M3 9l9-5 9 5v11H3z M8 20v-7h8v7 M3 9h18',
  maintenance: 'M14.5 6.5a4 4 0 0 0-5 5L3 18l3 3 6.5-6.5a4 4 0 0 0 5-5l-3 2-3-3z',
  inspections: 'M8 3h8l4 4v14H4V3z M8 12l2.5 2.5L16 9 M8 18h8',
  tracking: 'M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  bookings: 'M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16 M8 14h3 M8 18h3 M15 14h2',
  corporate: 'M3 21V6l7-3v18 M10 21V9l11-3v15 M6 9h1 M6 13h1 M6 17h1 M14 12h1 M18 12h1 M14 16h1 M18 16h1',
  customer: 'M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21a8 8 0 0 1 16 0',
  payroll: 'M4 6h16v13H4z M4 10h16 M8 15h3 M16 15h1',
  invoices: 'M6 3h12v18l-3-2-3 2-3-2-3 2z M9 8h6 M9 12h6 M9 16h4',
  billings: 'M3 6h18v12H3z M3 10h18 M7 15h4 M16 15h2',
  reviews: 'M12 3l2.8 5.8 6.4.9-4.6 4.5 1.1 6.3-5.7-3-5.7 3 1.1-6.3-4.6-4.5 6.4-.9z',
  users: 'M9 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M2 21a7 7 0 0 1 14 0 M17 6a4 4 0 0 1 0 8 M22 21a7 7 0 0 0-5-6.7',
  audit: 'M4 3h16v18H4z M8 8h8 M8 12h8 M8 16h5 M17 16h.01',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15l1.1 1.9-2 2-1.9-1.1a8 8 0 0 1-2.1.9L14 21h-4l-.5-2.3a8 8 0 0 1-2.1-.9l-1.9 1.1-2-2L4.6 15a8 8 0 0 1-.9-2.1L1.5 12l2.2-.9a8 8 0 0 1 .9-2.1L3.5 7l2-2 1.9 1.1a8 8 0 0 1 2.1-.9L10 3h4l.5 2.2a8 8 0 0 1 2.1.9L18.5 5l2 2L19.4 9a8 8 0 0 1 .9 2.1l2.2.9-2.2.9a8 8 0 0 1-.9 2.1z',
  enter: 'M20 4v8H4 M9 7l-5 5 5 5',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M17 17l4 4',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',
  chevron: 'M6 9l6 6 6-6',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  close: 'M5 5l14 14 M19 5L5 19',
  arrow: 'M4 12h16 M14 6l6 6-6 6',
  trend: 'M3 17l6-6 4 4 8-8 M16 7h5v5',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7v5l3 2',
  alert: 'M12 3L2 21h20z M12 9v5 M12 18h.01',
  check: 'M5 12l5 5L20 7',
  calendar: 'M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16',
  plus: 'M12 4v16 M4 12h16',
  more: 'M5 12h.01 M12 12h.01 M19 12h.01',
  eye: 'M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  edit: 'M4 20l4-.8L20 7l-3-3L5 16z M14.5 6.5l3 3',
  download: 'M12 3v12 M7 10l5 5 5-5 M4 18v3h16v-3',
  back: 'M15 5l-7 7 7 7',
  wallet: 'M3 6h18v14H3z M3 10h18 M7 16h5',
  reset: 'M4 11a8 8 0 1 1 2 6 M4 5v6h6',
  power: 'M12 3v9 M6.3 6.3a8 8 0 1 0 11.4 0',
  trash: 'M4 7h16 M9 7V4h6v3 M7 7l1 14h8l1-14 M10 11v6 M14 11v6',
  upload: 'M12 16V4 M7 9l5-5 5 5 M4 17v3h16v-3',
  document: 'M6 3h9l4 4v14H6z M15 3v5h4 M9 12h7 M9 16h7',
}

export default function Icon({ name, size = 19, className = '' }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={iconPaths[name] || iconPaths.dashboard} />
    </svg>
  )
}
