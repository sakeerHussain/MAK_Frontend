// Original synthesized chimes; no external audio assets or provider sounds.
export function createNotificationSound(storage, userId, Context = globalThis.AudioContext || globalThis.webkitAudioContext) {
 let context, busy = false
 const key = id => `notification-audio-${userId}-${id}`
 async function unlock() {
  if (!Context) throw new Error('Notification sound is not supported by this browser.')
  context ||= new Context()
  await context.resume()
  if (context.state !== 'running') throw new Error('Click Enable sound to allow notification audio.')
 }
 function chime(critical = false) {
  if (!context || context.state !== 'running') return false
  const notes = critical ? [[0, 659], [.18, 880], [.42, 659], [.60, 988]] : [[0, 523], [.16, 784], [.34, 1047]]
  for (const [offset, frequency] of notes) {
   const start = context.currentTime + offset, oscillator = context.createOscillator(), gain = context.createGain()
   oscillator.type = 'sine'; oscillator.frequency.value = frequency
   gain.gain.setValueAtTime(0, start)
   gain.gain.linearRampToValueAtTime(critical ? .075 : .045, start + .015)
   gain.gain.exponentialRampToValueAtTime(.001, start + .32)
   oscillator.connect(gain); gain.connect(context.destination)
   oscillator.start(start); oscillator.stop(start + .34)
   oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
  }
  return true
 }
 function notify(items, now = Date.now()) {
  if (busy || !context || context.state !== 'running') return
  const due = items.filter(item => {
   if (item.resolvedAt || item.acknowledgedAt || (item.priority !== 'Critical' && item.readAt)) return false
   let state; try { state = JSON.parse(storage.getItem(key(item.id))) } catch { /* Ignore invalid stored state. */ }
   return !state || (item.priority === 'Critical' && state.count < 3 && now - state.last >= 60000)
  })
  if (!due.length || !chime(due.some(item => item.priority === 'Critical'))) return
  // One chime per batch, at most two repeats per critical alert, across reloads.
  for (const item of due) {
   let state; try { state = JSON.parse(storage.getItem(key(item.id))) } catch { /* Ignore invalid stored state. */ }
   storage.setItem(key(item.id), JSON.stringify({count: (state?.count || 0) + 1, last: now}))
  }
  busy = true; setTimeout(() => { busy = false }, 1200)
 }
 return { unlock, chime, notify, close: () => { context?.close(); context = undefined } }
}
