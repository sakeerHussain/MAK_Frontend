import { useState } from 'react'
import { createPortal } from 'react-dom'
import { IconChevronRight, IconClock, IconClipboardCheck } from '@tabler/icons-react'
import AdminPageHeader from '../../app/AdminPageHeader.jsx'
import Icon from './ResourceIcon.jsx'
import { ResourceMenu } from './ResourceRegister.jsx'
import './OperationsRegister.css'

export function OperationsIcon({ name, size = 18, ...props }) {
  const Component = name === 'inspections' ? IconClipboardCheck : name === 'clock' ? IconClock : name === 'arrow' ? IconChevronRight : null
  return Component ? <Component size={size} stroke={1.7} aria-hidden="true" {...props} /> : <Icon name={name === 'maintenance' ? 'wrench' : name} size={size} {...props} />
}

export function OperationsHeading({ title, description, children }) {
  return <div className="operations-heading"><AdminPageHeader title={title} description={description} />{children}</div>
}

export function OperationsKpis({ label, items }) {
  return <div className="operations-kpis" role="group" aria-label={label} style={{ '--operations-kpi-count': items.length }}>
    {items.map(({ label: title, value, detail, icon, tone = 'blue', onClick }) => {
      const Tag = onClick ? 'button' : 'div'
      const MetricIcon = icon === 'clock' ? IconClock : icon === 'inspections' ? IconClipboardCheck : null
      return <Tag key={title} className="operations-kpi" {...(onClick ? { type: 'button', onClick } : {})}>
        <span className={`operations-kpi-icon ${tone}`}>{MetricIcon ? <MetricIcon size={21} stroke={1.7} aria-hidden="true" /> : <Icon name={icon} size={21} />}</span>
        <span className="operations-kpi-copy"><span>{title}</span><strong>{value}</strong><small>{detail}</small></span>
        {onClick && <IconChevronRight className="operations-kpi-arrow" size={15} stroke={1.7} aria-hidden="true" />}
      </Tag>
    })}
  </div>
}

// The menu stays inside the page's ReadOnlyScope, retaining existing permission rules.
export function OperationsRowActions({ reference, onView, onEdit }) {
  const [menu, setMenu] = useState(null)
  const open = (event) => {
    const trigger = event.currentTarget
    const box = trigger.getBoundingClientRect()
    setMenu({ trigger, host: trigger.closest('.operations-page'), x: Math.max(8, Math.min(box.right - 210, window.innerWidth - 218)), y: Math.max(8, Math.min(box.bottom + 5, window.innerHeight - 112)) })
  }
  return <>
    <button type="button" className="operations-more" aria-label={`More actions for ${reference}`} aria-haspopup="menu" aria-expanded={Boolean(menu)} onClick={open}><Icon name="more" size={20} /></button>
    {menu && createPortal(<ResourceMenu menu={menu} onClose={() => setMenu(null)} label={`Actions for ${reference}`} className="operations-action-menu">
      <button type="button" role="menuitem" onClick={() => { setMenu(null); onView() }}><Icon name="eye" /> View</button>
      {onEdit && <button type="button" role="menuitem" onClick={() => { setMenu(null); onEdit() }}><Icon name="edit" /> Edit</button>}
    </ResourceMenu>, menu.host)}
  </>
}
