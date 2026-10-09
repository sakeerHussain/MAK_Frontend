import { useState } from 'react'
import { forgotPassword, resetPassword } from './AuthApi.js'
import FormFieldCaption from '../../shared/components/FormFieldCaption.jsx'
import './AuthPage.css'
export default function RecoveryPage({ mode }) {
  const reset = mode === 'reset-password'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [done, setDone] = useState(false)
  const submit = async (event) => {
    event.preventDefault(); setNotice('')
    if (reset && (password !== confirm || password.length < 12)) { setNotice('Use 12+ characters and make sure the passwords match.'); return }
    setBusy(true)
    try { const result = reset ? await resetPassword(window.location.hash.split('/')[2] || '', password) : await forgotPassword(email); setNotice(result.message); setDone(true); setPassword(''); setConfirm('') }
    catch (error) { setNotice(error.message) }
    finally { setBusy(false) }
  }
  return <main className="auth-page"><div className="auth-content"><section className="auth-card"><header className="auth-heading"><h1>{reset ? 'Set a new password' : 'Forgot your password?'}</h1><p>{reset ? 'Use 12+ characters with letters, numbers and symbols.' : 'Enter your email to request a password reset link.'}</p></header>{!done && <form onSubmit={submit}><fieldset disabled={busy} style={{ border: 0, padding: 0 }}>{reset ? <><div className="auth-field"><label htmlFor="new-password"><FormFieldCaption required>New password</FormFieldCaption></label><input id="new-password" type="password" autoComplete="new-password" required minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} /></div><div className="auth-field"><label htmlFor="confirm-password"><FormFieldCaption required>Confirm password</FormFieldCaption></label><input id="confirm-password" type="password" autoComplete="new-password" required value={confirm} onChange={(event) => setConfirm(event.target.value)} /></div></> : <div className="auth-field"><label htmlFor="recovery-email"><FormFieldCaption required>Email address</FormFieldCaption></label><input id="recovery-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></div>}<button className="auth-submit" type="submit">{busy ? 'Please wait...' : reset ? 'Reset Password' : 'Send Reset Link'}</button></fieldset></form>}{notice && <p className="auth-notice" role="status">{notice}</p>}<p className="auth-switch"><a href="#/sign-in">Back to sign in</a></p></section></div></main>
}
