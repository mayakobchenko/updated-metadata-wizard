import { useCallback, useEffect, useRef, useState } from 'react'
import { getFigures, setFigures } from './figuresStore'

// Autosave of the draft to the Collab drive of the dataset (on by default, the person can switch it off):
//   /metadata_wizard_draft.json                       the answers (same content as "Download draft")
//   /metadata_wizard_draft_files/figures.json         captions, placement and tables
//   /metadata_wizard_draft_files/<id>.png|jpg         one file per figure picture (uploaded once, not on every save)
// Runs with the person's own EBRAINS login on the server.
// A draft that is already in the drive is never overwritten before the person has loaded it or chosen to start fresh.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const INTERVAL_OPTIONS = [30, 60, 120, 300]    // seconds between automatic saves
export const DEFAULT_INTERVAL = 30
export const intervalLabel = (sec) => (sec < 60 ? `${sec} seconds` : sec === 60 ? '1 minute' : `${sec / 60} minutes`)
const STOP_CODES = ['NO_LIBRARY', 'NO_WRITE', 'NO_DRIVE_ACCESS', 'SESSION_EXPIRED', 'BAD_ID']

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
const post = (path, body) => api(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

const extOf = (type) => (type === 'image/png' ? 'png' : 'jpg')

export default function useCollabDraft({ datasetVersionId, getPayload, editTick, onSaved }) {
  const valid = UUID.test(String(datasetVersionId || ''))
  const [enabled, setEnabled] = useState(true)
  const [status, setStatus] = useState('idle')        // idle | saving | saved | error
  const [error, setError] = useState('')
  const [note, setNote] = useState('')                // calm information, e.g. no Collab drive for this person
  const [savedAt, setSavedAt] = useState(null)
  const [remote, setRemote] = useState(null)          // null while looking; { exists, mtime }
  const [resolved, setResolved] = useState(false)     // the person decided what to do with an existing remote draft
  const [intervalSec, setIntervalSec] = useState(DEFAULT_INTERVAL)
  const [savedTick, setSavedTick] = useState(0)       // the edit counter that the last successful save covered
  const timer = useRef(null)
  const savedTickRef = useRef(0)
  const busy = useRef(false)
  const again = useRef(false)
  const tickRef = useRef(editTick); tickRef.current = editTick
  const intervalRef = useRef(DEFAULT_INTERVAL)
  const getPayloadRef = useRef(getPayload); getPayloadRef.current = getPayload
  const onSavedRef = useRef(onSaved); onSavedRef.current = onSaved
  const resolvedRef = useRef(false); resolvedRef.current = resolved
  const files = useRef(new Set())                     // picture files known to be in the drive folder

  const pending = valid && enabled && !!remote?.exists && !resolved
  const ready = valid && enabled && remote !== null && !remote.problem && !pending

  const refreshRemote = useCallback(async () => {
    if (!valid) return null
    try {
      const info = await api(`/api/drive/draft/info?datasetVersionId=${datasetVersionId}`)
      setRemote(info)
      if (info.library === false) {
        setEnabled(false)
        setNote(`No Collab drive d-${datasetVersionId} was found for your account, so no copy is kept there. You must be a member of that Collab.`)
      }
      // which picture files are already in the drive (so that removed pictures can be deleted again)
      try {
        const { index } = await api(`/api/drive/draft/figures/index?datasetVersionId=${datasetVersionId}`)
        files.current = new Set((index?.items || []).map(i => i.image?.file).filter(Boolean))
      } catch { /* no figures yet */ }
      return info
    } catch (e) {
      if (STOP_CODES.includes(e.code)) { setRemote({ exists: false }); setEnabled(false); setNote(e.message) }
      else setRemote({ exists: false, problem: e.message })      // temporary: tried again below
      return null
    }
  }, [datasetVersionId, valid])

  useEffect(() => { refreshRemote() }, [refreshRemote])

  // The check for an earlier draft failed for a temporary reason: say so and try again a few times.
  const retries = useRef(0)
  useEffect(() => {
    if (!remote?.problem) { if (remote) retries.current = 0; return undefined }
    const delays = [3000, 8000, 20000, 60000]
    if (retries.current >= delays.length) return undefined
    const t = setTimeout(() => { retries.current += 1; refreshRemote() }, delays[retries.current])
    return () => clearTimeout(t)
  }, [remote, refreshRemote])

  const syncFigures = useCallback(async () => {
    const items = getFigures()
    if (!items.length && !files.current.size) return        // nothing to keep, nothing to remove
    const keep = new Set()
    const index = { version: 1, items: [] }
    for (const it of items) {
      if (it.kind === 'figure' && it.image?.dataUrl) {
        const m = it.image.dataUrl.match(/^data:(image\/(?:png|jpeg));base64,(.*)$/s)
        if (!m) continue
        const file = `${it.id}.${extOf(m[1])}`
        if (!files.current.has(file)) {
          await post('/api/drive/draft/figures/image', { datasetVersionId, id: it.id, type: m[1], dataBase64: m[2] })
          files.current.add(file)
        }
        keep.add(file)
        const { dataUrl, ...image } = it.image
        index.items.push({ ...it, image: { ...image, file } })
      } else if (it.kind === 'table') {
        index.items.push(it)
      }
    }
    await post('/api/drive/draft/figures/index', { datasetVersionId, index })
    for (const f of [...files.current]) {
      if (keep.has(f)) continue
      await post('/api/drive/draft/figures/delete', { datasetVersionId, file: f })
      files.current.delete(f)
    }
  }, [datasetVersionId])

  const saveNow = useCallback(async () => {
    if (!valid) return
    if (busy.current) { again.current = true; return }
    busy.current = true; setStatus('saving'); setError('')
    clearTimeout(timer.current); timer.current = null      // a save is running, no extra one is planned
    const tickAtStart = tickRef.current
    try {
      // Before the first save: make sure no earlier draft is in the drive (the check at page load may have failed).
      if (!resolvedRef.current) {
        const info = await refreshRemote()
        if (!info) throw new Error('The Collab drive could not be checked for an earlier draft, so nothing was saved. It will be tried again after your next change.')
        if (info.exists) { setStatus('idle'); return }          // the "saved draft found" notice takes over
      }
      const payload = await getPayloadRef.current()
      const r = await post('/api/drive/draft/save', { datasetVersionId, payload })
      await syncFigures()
      setSavedAt(new Date(r.savedAt)); setStatus('saved'); setResolved(true)
      setRemote({ exists: true, mtime: r.savedAt })
      savedTickRef.current = tickAtStart; setSavedTick(tickAtStart)
      if (tickRef.current === tickAtStart) onSavedRef.current?.()
    } catch (e) {
      setStatus('error'); setError(e.message)
      if (STOP_CODES.includes(e.code)) setEnabled(false)    // the person must act; the bar shows why
      else timer.current = setTimeout(() => { timer.current = null; saveNow() }, Math.max(intervalRef.current, 30) * 1000)   // try again
    } finally {
      busy.current = false
      if (again.current) { again.current = false; saveNow() }
    }
  }, [datasetVersionId, valid, syncFigures, refreshRemote])

  // Saves at most once per interval: the first change after a save starts the clock, further changes do not postpone it.
  // Never before the first edit, never while a remote draft is undecided.
  intervalRef.current = intervalSec
  useEffect(() => {
    if (!ready || editTick === 0 || editTick === savedTickRef.current) return
    if (timer.current) return
    timer.current = setTimeout(() => { timer.current = null; saveNow() }, intervalSec * 1000)
  }, [ready, editTick, intervalSec, saveNow])
  // a new interval, or the copy switched off: drop the planned save (the effect above plans a new one if needed)
  useEffect(() => () => { clearTimeout(timer.current); timer.current = null }, [intervalSec, ready])

  const unsaved = ready && editTick > 0 && editTick !== savedTick

  const enable = useCallback(() => { setEnabled(true); setNote(''); setResolved(true); saveNow() }, [saveNow])
  const disable = useCallback(() => { setEnabled(false); setStatus('idle'); setError('') }, [])
  const resolve = useCallback(() => setResolved(true), [])
  const load = useCallback(async () => (await api(`/api/drive/draft/load?datasetVersionId=${datasetVersionId}`)).payload, [datasetVersionId])

  // pictures and tables of the saved draft, ready for the figures store (null when there are none)
  const loadFigures = useCallback(async () => {
    const { index } = await api(`/api/drive/draft/figures/index?datasetVersionId=${datasetVersionId}`)
    if (!index?.items?.length) return null
    const out = []
    for (const it of index.items) {
      if (it.kind === 'figure' && it.image?.file) {
        const img = await api(`/api/drive/draft/figures/image?datasetVersionId=${datasetVersionId}&file=${encodeURIComponent(it.image.file)}`)
        const { file, ...image } = it.image
        out.push({ ...it, image: { ...image, dataUrl: `data:${img.type};base64,${img.dataBase64}` } })
      } else if (it.kind === 'table') out.push(it)
    }
    return out
  }, [datasetVersionId])

  return { available: valid, enabled, pending, unsaved, intervalSec, setIntervalSec, status, error, note, savedAt, remote, enable, disable, resolve, saveNow, load, loadFigures, refreshRemote }
}
export { setFigures }
