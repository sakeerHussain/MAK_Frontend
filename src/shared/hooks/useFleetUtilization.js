import { useEffect, useState } from 'react'
import { getFleetUtilization } from '../../features/fleet/FleetApi.js'

export default function useFleetUtilization(period, enabled, vehicles) {
  const [result, setResult] = useState({ period: '', data: null, loading: true, error: '' })
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    if (!enabled) return
    let active = true, sequence = 0, controller
    const load = async () => {
      const request = ++sequence
      controller?.abort()
      controller = new AbortController()
      setResult(previous => ({ ...previous, period, loading: true, error: '' }))
      try {
        const data = await getFleetUtilization(period, controller.signal)
        if (active && request === sequence) setResult({ period, data, loading: false, error: '' })
      } catch (reason) {
        if (active && request === sequence) setResult({ period, data: null, loading: false, error: reason.message })
      }
    }
    load()
    const refreshVisible = () => { if (document.visibilityState === 'visible') load() }
    const timer = setInterval(refreshVisible, 60_000)
    window.addEventListener('focus', refreshVisible)
    document.addEventListener('visibilitychange', refreshVisible)
    return () => {
      active = false; controller?.abort(); clearInterval(timer)
      window.removeEventListener('focus', refreshVisible)
      document.removeEventListener('visibilitychange', refreshVisible)
    }
  }, [period, enabled, vehicles, revision])
  return { ...result, data: result.period === period ? result.data : null, error: result.period === period ? result.error : '', loading: result.loading || result.period !== period,
    refresh: () => setRevision(value => value + 1) }
}
