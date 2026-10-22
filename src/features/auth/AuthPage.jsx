import { useEffect, useState } from 'react'
import Icon from '../../app/Icon.jsx'
import FormFieldCaption from '../../shared/components/FormFieldCaption.jsx'
import { authConfiguration, loginAccount, signupAccount } from './AuthApi.js'
import './AuthPage.css'

function PasswordField({ id, label, value, onChange, error, hint, autoComplete }) {
  const [visible, setVisible] = useState(false)
  return <div className="auth-field"><label htmlFor={id}><FormFieldCaption required>{label}</FormFieldCaption></label><div className="auth-password"><input id={id} name={id} type={visible ? 'text' : 'password'} value={value} onChange={onChange} autoComplete={autoComplete} required aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} /><button type="button" aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} aria-pressed={visible} onClick={() => setVisible(!visible)}><Icon name="eye" size={18} /></button></div>{hint && <small id={`${id}-hint`}>{hint}</small>}{error && <p className="auth-field-error" id={`${id}-error`}>{error}</p>}</div>
}

export default function AuthPage({ mode, onSignedIn }) {
  const signup = mode === 'sign-up'
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', remember: false, terms: false, bootstrapCode: '' })
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [config, setConfig] = useState(null)
  const [configError, setConfigError] = useState('')
  useEffect(() => { let active = true; authConfiguration().then((value) => { if (active) setConfig(value) }).catch((error) => { if (active) setConfigError(error.message) }); return () => { active = false } }, [])
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
        const result = await signupAccount({ name: form.name.trim(), email: form.email.trim(), password: form.password, terms: form.terms, bootstrapCode: config?.bootstrapRequired ? form.bootstrapCode : undefined })
        setNotice(result.message); if (result.status === 'Active') setConfig((current) => ({ ...current, bootstrapRequired: false })); setForm((current) => ({ ...current, password: '', confirmPassword: '', bootstrapCode: '' }))
      } else { const result = await loginAccount({ email: form.email.trim(), password: form.password, remember: form.remember }); onSignedIn(result.user) }
    } catch (error) { setNotice(error.message) }
    finally { setBusy(false) }

  }
  return <main className="auth-page">
    <div className="auth-art auth-art-top" aria-hidden="true"><i /><i /><i /><b /></div><div className="auth-art auth-art-bottom" aria-hidden="true"><i /><i /><i /><b /></div>
    <div className="auth-content"><section className="auth-card" aria-labelledby="auth-title">
      <a className="auth-brand" href="#/home" aria-label="Back to MAK Rentals home"><span className="brand-mark"><span /><span /><span /></span><span>Rental<span>Admin</span></span></a>
      <header className="auth-heading"><h1 id="auth-title">{signup ? 'Create your account' : 'Welcome back'}</h1><p>{signup ? 'Get started with Rental Admin. Enter your details below.' : 'Sign in to manage your rental operations.'}</p></header>
      <div className="auth-social"><button type="button" onClick={() => setNotice('Google sign-in is not connected yet.')}><span className="auth-google" aria-hidden="true">G</span> {signup ? 'Sign up' : 'Sign in'} with Google</button><button type="button" onClick={() => setNotice('Microsoft sign-in is not connected yet.')}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24"><path fill="#f25022" d="M1 1h10v10H1z" /><path fill="#7fba00" d="M13 1h10v10H13z" /><path fill="#00a4ef" d="M1 13h10v10H1z" /><path fill="#ffb900" d="M13 13h10v10H13z" /></svg> {signup ? 'Sign up' : 'Sign in'} with Microsoft</button></div>
      <div className="auth-divider"><span>Continue with email</span></div>
      <form onSubmit={submit} noValidate><fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        {configError && <p className="auth-field-error" role="alert">{configError}</p>}
        {signup && config?.bootstrapRequired && <div className="auth-field"><p className="auth-notice">First administrator setup. Enter the code configured on the backend.</p><label htmlFor="auth-bootstrapCode"><FormFieldCaption required>Administrator setup code</FormFieldCaption></label><input id="auth-bootstrapCode" type="password" autoComplete="off" value={form.bootstrapCode} onChange={(event) => set('bootstrapCode', event.target.value)} required />{errors.bootstrapCode && <p className="auth-field-error">{errors.bootstrapCode}</p>}{!config.bootstrapConfigured && <p className="auth-field-error">Set AUTH_BOOTSTRAP_CODE on the backend before creating the administrator.</p>}</div>}
        {signup && <div className="auth-field"><label htmlFor="auth-name"><FormFieldCaption required>Full name</FormFieldCaption></label><input id="auth-name" name="name" value={form.name} onChange={(event) => set('name', event.target.value)} placeholder="Your full name" autoComplete="name" maxLength={200} required aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'auth-name-error' : undefined} />{errors.name && <p className="auth-field-error" id="auth-name-error">{errors.name}</p>}</div>}
        <div className="auth-field"><label htmlFor="auth-email"><FormFieldCaption required>Email address</FormFieldCaption></label><input id="auth-email" name="email" type="email" value={form.email} onChange={(event) => set('email', event.target.value)} placeholder="you@example.com" autoComplete={signup ? 'email' : 'username'} maxLength={254} required aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'auth-email-error' : undefined} />{errors.email && <p className="auth-field-error" id="auth-email-error">{errors.email}</p>}</div>
        <PasswordField id="auth-password" label="Password" value={form.password} onChange={(event) => set('password', event.target.value)} error={errors.password} autoComplete={signup ? 'new-password' : 'current-password'} hint={signup ? 'Use 12+ characters with letters, numbers and symbols.' : null} />
        {signup && <PasswordField id="auth-confirmPassword" label="Confirm password" value={form.confirmPassword} onChange={(event) => set('confirmPassword', event.target.value)} error={errors.confirmPassword} autoComplete="new-password" />}
        {signup ? <div className="auth-terms"><label className="auth-checkbox"><input id="auth-terms" type="checkbox" checked={form.terms} onChange={(event) => set('terms', event.target.checked)} required aria-invalid={Boolean(errors.terms)} aria-describedby={errors.terms ? 'auth-terms-error' : undefined} /><span>I agree to the <button type="button" className="auth-text-button" onClick={() => setNotice('Contact your administrator for the current terms of service.')}>Terms of Service</button> and <button type="button" className="auth-text-button" onClick={() => setNotice('Contact your administrator for the current privacy policy.')}>Privacy Policy</button>.</span></label>{errors.terms && <p className="auth-field-error" id="auth-terms-error">{errors.terms}</p>}</div> : <div className="auth-options"><label className="auth-checkbox"><input type="checkbox" checked={form.remember} onChange={(event) => set('remember', event.target.checked)} /><span>Keep me signed in</span></label><a href="#/forgot-password" className="auth-text-button">Forgot password?</a></div>}
        {notice && <div className="auth-notice" role="status">{notice}</div>}
        <button type="submit" className="auth-submit" disabled={busy || (signup && !config)}>{busy ? 'Please wait...' : signup ? 'Create Account' : 'Sign In'}<Icon name="arrow" size={17} /></button>
      </fieldset></form>
      <p className="auth-switch"><a href="#/home">Back to home</a></p>
      <p className="auth-switch">{signup ? 'Already have an account?' : 'New here?'} <a href={signup ? '#/sign-in' : '#/sign-up'}>{signup ? 'Sign in' : 'Create an account'}</a></p>

    </section><footer className="auth-footer">&copy; {new Date().getFullYear()} MAK admin &middot; Rental operations</footer></div>
  </main>
}
