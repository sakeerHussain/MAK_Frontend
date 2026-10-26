import BillingProfileEditor from '../invoices/BillingProfileEditor.jsx'
import { IconSettings, IconUsers, IconShieldCheck } from '@tabler/icons-react'
import { FinanceHeading } from '../../shared/components/FinanceRegister.jsx'
import './Management.css'

const icons = { 'Staff & Users': IconUsers, 'Audit Log': IconShieldCheck, Settings: IconSettings }

export default function SettingsPage({ onNavigate, pages }) {
  return <div className="finance-page management-page">
    <FinanceHeading title="Settings" description="Manage workspace settings and preferences." />
    <div className="management-settings-layout"><nav className="management-settings-nav" aria-label="Management pages"><h2>Management</h2>{pages.map((page) => { const Icon = icons[page]; return <button type="button" key={page} aria-current={page === 'Settings' ? 'page' : undefined} onClick={() => onNavigate(page)}><Icon size={19} stroke={1.7} aria-hidden="true" />{page}</button> })}</nav>
      <BillingProfileEditor />
    </div>
  </div>
}
