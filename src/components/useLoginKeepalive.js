import { useEffect, useRef, useState } from 'react'

// Keeps the EBRAINS login alive while the wizard is open. The login expires after about 30 minutes WITHOUT use,
// and filling in the metadata takes longer, so the server renews it every few minutes (nothing is reloaded or lost).
// Returns true when the login is really gone (it was active before, now it is not): expired, or the server restarted.
const EVERY_MS = 8 * 60 * 1000

export default function useLoginKeepalive() {
  const [lost, setLost] = useState(false)
  const wasActive = useRef(false)

  useEffect(() => {
    let stopped = false
    const ping = async () => {
      try {
        const res = await fetch('/api/auth/keepalive', { credentials: 'same-origin', cache: 'no-store' })
        if (!res.ok) return                       // a temporary problem: try again at the next ping
        const { active } = await res.json()
        if (stopped) return
        if (active) { wasActive.current = true; setLost(false) }
        else if (wasActive.current) setLost(true)
      } catch { /* offline or server busy: try again later */ }
    }
    ping()
    const timer = setInterval(ping, EVERY_MS)
    // a computer that slept, or a tab that was in the background, is checked as soon as the person is back
    const onVisible = () => { if (document.visibilityState === 'visible') ping() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { stopped = true; clearInterval(timer); document.removeEventListener('visibilitychange', onVisible) }
  }, [])

  return lost
}
