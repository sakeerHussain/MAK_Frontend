import { useCallback, useEffect, useState } from 'react'
import App from './App.jsx'
import LandingPage from '../features/public/LandingPage.jsx'
import AuthPage from '../features/auth/AuthPage.jsx'
import RecoveryPage from '../features/auth/RecoveryPage.jsx'
import { currentAccount, logoutAccount } from '../features/auth/AuthApi.js'
const publicTitles = { public:'Welcome', 'our-fleet':'Our Fleet', 'about-us':'About Us', services:'Services', 'contact-us':'Contact Us' }
function readScreen() {
  const path = window.location.hash.replace(/^#\/?/, '').split('/')[0].split('?')[0]
  return !path || path === 'home' ? 'public' : Object.hasOwn(publicTitles, path) ? path : path === 'sign-in' ? 'sign-in' : path === 'sign-up' ? 'sign-up' : ['forgot-password', 'reset-password'].includes(path) ? path : 'admin'
}
export default function AppRouter() {
  const [screen, setScreen] = useState(readScreen)
  const [session, setSession] = useState({ loading: true, user: null, error: '' })
  const reload = useCallback(async () => {
    setSession((current) => ({ ...current, loading: true, error: '' }))
    try { const { user } = await currentAccount(); setSession({ loading: false, user, error: '' }) }
    catch (error) { setSession({ loading: false, user: null, error: error.message }) }
  }, [])
  useEffect(() => {
    let active = true
    currentAccount().then(({ user }) => { if (active) setSession({ loading: false, user, error: '' }) })
      .catch((error) => { if (active) setSession({ loading: false, user: null, error: error.message }) })
    const expire = () => { setSession({ loading: false, user: null, error: '' }); window.location.hash = '/sign-in' }
    const update = () => setScreen(readScreen())
    window.addEventListener('hashchange', update); window.addEventListener('popstate', update); window.addEventListener('auth-expired', expire)
    return () => { active = false; window.removeEventListener('hashchange', update); window.removeEventListener('popstate', update); window.removeEventListener('auth-expired', expire) }
  }, [])
  useEffect(() => { document.title = Object.hasOwn(publicTitles, screen) ? `${publicTitles[screen]} | MAK Rentals` : screen === 'admin' ? 'MAK admin' : screen === 'sign-up' ? 'Create Account | MAK admin' : 'Sign In | MAK admin'; window.scrollTo(0, 0) }, [screen])
  useEffect(() => { if (session.user && ['sign-in', 'sign-up'].includes(screen)) window.location.hash = '/dashboard' }, [session.user, screen])
  const signedIn = (user) => { setSession({ loading: false, user, error: '' }); window.location.hash = '/dashboard' }
  const signOut = async () => { await logoutAccount(); setSession({ loading: false, user: null, error: '' }); window.location.hash = '/sign-in' }
  if (Object.hasOwn(publicTitles, screen)) return <LandingPage key={screen} page={screen === 'public' ? 'home' : screen} user={session.user} />
  if (session.loading) return <main className="auth-page"><section className="auth-card" role="status">Checking your session...</section></main>
  if (session.error) return <main className="auth-page"><section className="auth-card"><h1>Unable to connect</h1><p role="alert">{session.error}</p><button className="auth-submit" onClick={reload}>Retry</button></section></main>
  if (screen === 'forgot-password' || screen === 'reset-password') return <RecoveryPage key={window.location.hash} mode={screen} />
  if (session.user) return <App key={`${session.user.id}-${session.user.role}`} user={session.user} onLogout={signOut} />
  return <AuthPage key={screen === 'sign-up' ? screen : 'sign-in'} mode={screen === 'sign-up' ? 'sign-up' : 'sign-in'} onSignedIn={signedIn} />
}
