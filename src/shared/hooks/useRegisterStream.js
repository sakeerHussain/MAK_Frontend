import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { nextWindowSize, REGISTER_BATCH_SIZE } from '../lib/registerStream.js'

function afterPaint() {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
}

export default function useRegisterStream({ rows, resetKey, detailOpen, prepareBatch = afterPaint }) {
  const [windowState, setWindowState] = useState({ key: resetKey, count: REGISTER_BATCH_SIZE, loading: false, error: '' })
  const sentinelRef = useRef(null)
  const busy = useRef(null)
  const saved = useRef(null)
  const previousDetail = useRef(detailOpen)
  // A changed filter starts a new window immediately; late promises are ignored.
  if (windowState.key !== resetKey) setWindowState({ key: resetKey, count: REGISTER_BATCH_SIZE, loading: false, error: '' })
  const count = windowState.key === resetKey ? windowState.count : REGISTER_BATCH_SIZE
  const loaded = Math.min(count, rows.length)
  const hasMore = loaded < rows.length
  const loadMore = useCallback(async () => {
    if (detailOpen || !hasMore || busy.current?.key === resetKey) return
    const request = { key: resetKey }
    busy.current = request
    setWindowState((current) => current.key === resetKey ? { ...current, loading: true, error: '' } : current)
    try {
      await prepareBatch()
      if (busy.current !== request) return
      setWindowState((current) => current.key === resetKey ? { ...current, count: nextWindowSize(current.count, rows.length), loading: false } : current)
    } catch {
      if (busy.current !== request) return
      setWindowState((current) => current.key === resetKey ? { ...current, loading: false, error: 'Could not display more records. Please try again.' } : current)
    } finally {
      if (busy.current === request) busy.current = null
    }
  }, [detailOpen, hasMore, prepareBatch, resetKey, rows.length])

  useEffect(() => {
    if (detailOpen || !hasMore || windowState.loading || windowState.error || !sentinelRef.current || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) void loadMore() }, { root: sentinelRef.current.closest('.main-scroll'), rootMargin: '0px 0px 160px 0px' })
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [detailOpen, hasMore, loadMore, windowState.loading, windowState.error])

  useEffect(() => () => { busy.current = null }, [])

  const rememberPosition = (navigate, id, trigger) => {
    const scroller = document.querySelector('.main-scroll')
    saved.current = { id: String(id), top: scroller?.scrollTop || 0, left: scroller?.querySelector('.booking-table-scroll')?.scrollLeft || 0, trigger }
    navigate(id)
  }
  useLayoutEffect(() => {
    if (!detailOpen && previousDetail.current && saved.current) {
      const scroller = document.querySelector('.main-scroll')
      // Also cancels App's existing smooth-to-top navigation on return.
      scroller?.scrollTo({ top: saved.current.top, behavior: 'instant' })
      const table = scroller?.querySelector('.booking-table-scroll')
      if (table) table.scrollLeft = saved.current.left
      const row = [...(scroller?.querySelectorAll('[data-register-record]') || [])].find((element) => element.dataset.registerRecord === saved.current.id)
      const focusTarget = saved.current.trigger?.isConnected ? saved.current.trigger : row?.querySelector('.booking-id-link')
      focusTarget?.focus({ preventScroll: true })
    }
    previousDetail.current = detailOpen
  }, [detailOpen])

  return { visible: rows.slice(0, loaded), loaded, total: rows.length, hasMore, loading: windowState.loading, error: windowState.error, loadMore, sentinelRef, rememberPosition }
}
