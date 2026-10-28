import { useCallback, useEffect, useRef, useState } from 'react'

// Optional autosave of the draft to the Collab drive of the dataset (file metadata_wizard_draft.json in drive d-<id>).
// Off by default; the person switches it on. Runs with the person's own EBRAINS login on the server.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DELAY_MS = 20 * 1000

async function api(path, options) {
  const res = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...options })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(body.error || `The server answered ${res.status}.`)
    err.code = body.code || 'ERROR'
    throw err
  }
  return body
}

export default function useCollabDraft({ datasetVersionId, getPayload, editTick, onSaved }) {
  const valid = UUID.test(String(datasetVersionId || ''))
  const [enabled, setEnabled] = useState(false)
  const [status, setStatus] = useState('idle')        // idle | saving | saved | error
  const [error, setError] = useState('')
  const [savedAt, setSavedAt] = useState(null)
  const [remote, setRemote] = useState(null)          // { exists, mtime } of the draft already in the drive
  const busy = useRef(false)
  const again = useRef(false)
  const tickRef = useRef(editTick)
  tickRef.current = editTick
  const getPayloadRef = useRef(getPayload); getPayloadRef.current = getPayload
  const onSavedRef = useRef(onSaved); onSavedRef.current = onSaved

  const refreshRemote = useCallback(async () => {
    if (!valid) return null
    try {
      const info = await api(`/api/drive/draft/info?datasetVersionId=${datasetVersionId}`)
      setRemote(info)
      return info
    } catch (e) { setRemote({ exists: false, problem: e.message, code: e.code }); return null }
  }, [datasetVersionId, valid])

  useEffect(() => { refreshRemote() }, [refreshRemote])

  const saveNow = useCallback(async () => {
    if (!valid) return
    if (busy.current) { again.current = true; return }
    busy.current = true; setStatus('saving'); setError('')
    const tickAtStart = tickRef.current
    try {
      const payload = await getPayloadRef.current()
      const r = await api('/api/drive/draft/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasetVersionId, payload }),
      })
      setSavedAt(new Date(r.savedAt)); setStatus('saved')
      setRemote({ exists: true, mtime: r.savedAt })
      if (tickRef.current === tickAtStart) onSavedRef.current?.()
    } catch (e) {
      setStatus('error'); setError(e.message)
      // no access / no login: stop trying, the person must act
      if (['NO_LIBRARY', 'NO_WRITE', 'NO_DRIVE_ACCESS', 'SESSION_EXPIRED', 'BAD_ID'].includes(e.code)) setEnabled(false)
    } finally {
      busy.current = false
      if (again.current) { again.current = false; saveNow() }
    }
  }, [datasetVersionId, valid])

  // a few seconds after the last edit
  useEffect(() => {
    if (!enabled) return undefined
    const t = setTimeout(saveNow, DELAY_MS)
    return () => clearTimeout(t)
  }, [enabled, editTick, saveNow])

  const enable = useCallback(() => { setEnabled(true); saveNow() }, [saveNow])
  const disable = useCallback(() => { setEnabled(false); setStatus('idle'); setError('') }, [])
  const load = useCallback(async () => (await api(`/api/drive/draft/load?datasetVersionId=${datasetVersionId}`)).payload, [datasetVersionId])

  return { available: valid, enabled, status, error, savedAt, remote, enable, disable, saveNow, load, refreshRemote }
}
