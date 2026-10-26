import { useEffect, useState } from 'react'
import { IconArrowRight, IconEye, IconEyeOff } from '@tabler/icons-react'
import FormFieldCaption from '../../shared/components/FormFieldCaption.jsx'
import { authConfiguration, loginAccount, signupAccount, previewInvitation } from './AuthApi.js'
import './AuthPage.css'
import './AuthSplit.css'

function PasswordField({ id, label, value, onChange, error, hint, autoComplete }) {
  const [visible, setVisible] = useState(false)
  return <div className="auth-field"><label htmlFor={id}><FormFieldCaption required>{label}</FormFieldCaption></label><div className="auth-password"><input id={id} name={id} type={visible ? 'text' : 'password'} value={value} onChange={onChange} autoComplete={autoComplete} required aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} /><button type="button" aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} aria-pressed={visible} onClick={() => setVisible(!visible)}><span aria-hidden="true">{visible ? <IconEyeOff size={20} stroke={1.7} /> : <IconEye size={20} stroke={1.7} />}</span></button></div>{hint && <small id={`${id}-hint`}>{hint}</small>}{error && <p className="auth-field-error" id={`${id}-error`}>{error}</p>}</div>
}

export default function AuthPage({ mode, onSignedIn }) {
  const signup = mode === 'sign-up'
  const invitationToken=signup?new URLSearchParams(window.location.hash.split('?')[1]||'').get('invitation'):null
  const [invitation,setInvitation]=useState(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', remember: false, terms: false, bootstrapCode: '' })
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [config, setConfig] = useState(null)
  const [configError, setConfigError] = useState('')
  useEffect(() => { let active = true; authConfiguration().then((value) => { if (active) setConfig(value) }).catch((error) => { if (active) setConfigError(error.message) }); return () => { active = false } }, [])
  useEffect(()=>{if(!invitationToken)return;let active=true;previewInvitation(invitationToken).then(data=>{if(active){setInvitation(data);setForm(current=>({...current,name:data.name,email:data.email}))}}).catch(error=>{if(active)setConfigError(error.message)});return()=>{active=false}},[invitationToken])
  const set = (key, value) => { setForm((current) => ({ ...current, [key]: value })); setErrors((current) => ({ ...current, [key]: '' })); setNotice('') }
  const submit = async (event) => {
    event.preventDefault()
    const next = {}
    if (signup && !form.name.trim()) next.name = 'Enter your full name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter a valid email address.'
    if (!form.password) next.password = 'Enter your password.'
    else if (signup && (form.password.length < 12 || !/[a-zA-Z]/.test(form.password) || !/\d/.test(form.password) || !/[^a-zA-Z0-9\s]/.test(form.password))) next.password = 'Use at least 12 characters with a letter, number and symbol.'
    if (signup && form.confirmPassword !== form.password) next.confirmPassword = 'Passwords do not match.'
    if (signup && !form.terms) next.terms = 'Please confirm the terms and privacy checkbox.'
    if (signup && config?.bootstrapRequired && !form.bootstrapCode.trim()) next.bootstrapCode = 'Enter the administrator setup code.'
    setErrors(next)
    if (Object.keys(next).length) {
      setNotice('')
      const first = Object.keys(next)[0]
      document.getElementById(`auth-${first}`)?.focus()
      return
    }
    setBusy(true); setNotice('')
    try {
      if (signup) {
        const result = await signupAccount({ name: form.name.trim(), email: form.email.trim(), password: form.password, terms: form.terms, bootstrapCode: config?.bootstrapRequired ? form.bootstrapCode : undefined, invitationToken: invitationToken || undefined })
        setNotice(result.message); if (result.status === 'Active') setConfig((current) => ({ ...current, bootstrapRequired: false })); setForm((current) => ({ ...current, password: '', confirmPassword: '', bootstrapCode: '' }))
      } else { const result = await loginAccount({ email: form.email.trim(), password: form.password, remember: form.remember }); onSignedIn(result.user) }
    } catch (error) { setNotice(error.message) }
    finally { setBusy(false) }

  }
  return <main className={`auth-page auth-page--split ${signup ? 'auth-page--signup' : ''}`}>
    <div className="auth-content">
      <div className="auth-split-surface">
        <section className="auth-card" aria-labelledby="auth-title">
          <a className="auth-brand" href="#/home" aria-label="Back to MAK International home">
            <img src="/images/mak-admin-logo.jpg" width="360" height="95" alt="MAK International" />
          </a>
          <header className="auth-heading">
            <h1 id="auth-title">{signup ? 'Create your account' : 'Welcome back'}</h1>
            <p>{signup ? 'Get started with your MAK workspace.' : 'Sign in to your MAK workspace.'}</p>
          </header>
      <form onSubmit={submit} noValidate aria-busy={busy}><fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        {configError && <p className="auth-field-error" role="alert">{configError}</p>}{invitation&&<p className="auth-notice">You are invited to MAK as {invitation.role}. Create your account using the invited email.</p>}
        {signup && config?.bootstrapRequired && <div className="auth-field"><p className="auth-notice">First administrator setup. Enter the code configured on the backend.</p><label htmlFor="auth-bootstrapCode"><FormFieldCaption required>Administrator setup code</FormFieldCaption></label><input id="auth-bootstrapCode" type="password" autoComplete="off" aria-invalid={Boolean(errors.bootstrapCode)} aria-describedby={errors.bootstrapCode ? 'auth-bootstrapCode-error' : undefined} value={form.bootstrapCode} onChange={(event) => set('bootstrapCode', event.target.value)} required />{errors.bootstrapCode && <p className="auth-field-error" id="auth-bootstrapCode-error">{errors.bootstrapCode}</p>}{!config.bootstrapConfigured && <p className="auth-field-error">Set AUTH_BOOTSTRAP_CODE on the backend before creating the administrator.</p>}</div>}
        {signup && <div className="auth-field"><label htmlFor="auth-name"><FormFieldCaption required>Full name</FormFieldCaption></label><input id="auth-name" name="name" value={form.name} onChange={(event) => set('name', event.target.value)} placeholder="Your full name" autoComplete="name" maxLength={200} required aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'auth-name-error' : undefined} />{errors.name && <p className="auth-field-error" id="auth-name-error">{errors.name}</p>}</div>}
        <div className="auth-field"><label htmlFor="auth-email"><FormFieldCaption required>Email address</FormFieldCaption></label><input id="auth-email" name="email" type="email" readOnly={Boolean(invitation)} value={form.email} onChange={(event) => set('email', event.target.value)} placeholder="you@company.com" autoComplete={signup ? 'email' : 'username'} maxLength={254} required aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'auth-email-error' : undefined} />{errors.email && <p className="auth-field-error" id="auth-email-error">{errors.email}</p>}</div>
        <PasswordField id="auth-password" label="Password" value={form.password} onChange={(event) => set('password', event.target.value)} error={errors.password} autoComplete={signup ? 'new-password' : 'current-password'} hint={signup ? 'Use 12+ characters with letters, numbers and symbols.' : null} />
        {signup && <PasswordField id="auth-confirmPassword" label="Confirm password" value={form.confirmPassword} onChange={(event) => set('confirmPassword', event.target.value)} error={errors.confirmPassword} autoComplete="new-password" />}
        {signup ? <div className="auth-terms"><label className="auth-checkbox"><input id="auth-terms" type="checkbox" checked={form.terms} onChange={(event) => set('terms', event.target.checked)} required aria-invalid={Boolean(errors.terms)} aria-describedby={errors.terms ? 'auth-terms-error' : undefined} /><span>I agree to the <button type="button" className="auth-text-button" onClick={() => setNotice('Contact your administrator for the current terms of service.')}>Terms of Service</button> and <button type="button" className="auth-text-button" onClick={() => setNotice('Contact your administrator for the current privacy policy.')}>Privacy Policy</button>.</span></label>{errors.terms && <p className="auth-field-error" id="auth-terms-error">{errors.terms}</p>}</div> : <div className="auth-options"><label className="auth-checkbox"><input type="checkbox" checked={form.remember} onChange={(event) => set('remember', event.target.checked)} /><span>Keep me signed in</span></label><a href="#/forgot-password" className="auth-text-button">Forgot password?</a></div>}
        {notice && <div className="auth-notice" role="status">{notice}</div>}
        <button type="submit" className="auth-submit" disabled={busy || (signup && !config) || Boolean(invitationToken&&!invitation)}>{busy ? 'Please wait...' : signup ? 'Create account' : 'Sign in'}<IconArrowRight size={20} stroke={1.7} aria-hidden="true" /></button>
      </fieldset></form>
          <p className="auth-switch">{signup ? 'Already have an account?' : 'New to MAK?'} <a href={signup ? '#/sign-in' : '#/sign-up'}>{signup ? 'Sign in' : 'Create an account'}</a></p>
          <div className="auth-divider" id="auth-social-status"><span>Not connected yet</span></div>
          <div className="auth-social" aria-describedby="auth-social-status">
            <button type="button" disabled={busy} aria-label={`${signup ? 'Sign up' : 'Sign in'} with Google — not connected yet`} onClick={() => setNotice('Google sign-in is not connected yet.')}><img src="/images/auth/google.svg" width="24" height="24" alt="" />Google</button>
            <button type="button" disabled={busy} aria-label={`${signup ? 'Sign up' : 'Sign in'} with Microsoft — not connected yet`} onClick={() => setNotice('Microsoft sign-in is not connected yet.')}><img src="/images/auth/microsoft.svg" width="24" height="24" alt="" />Microsoft</button>
          </div>
          <p className="auth-home"><a href="#/home">Back to home</a></p>
        </section>
        <aside className="auth-welcome-panel" aria-label="Your MAK workspace">
          <img className="auth-panel-art" src="/images/auth/mak-workspace.jpg" width="1038" height="1515" alt="" fetchPriority="high" />
          <div className="auth-welcome-copy"><h2>Every booking. One clear view.</h2><p>Manage vehicles, trips and payments in one place.</p></div>
        </aside>
      </div>
      <footer className="auth-footer">&copy; {new Date().getFullYear()} MAK International</footer>
    </div>
  </main>
}
