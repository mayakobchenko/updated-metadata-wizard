import { useState, useEffect, useRef } from 'react'
import { Input, Button, Typography, Alert, Spin } from 'antd'
import { ApartmentOutlined, ReloadOutlined } from '@ant-design/icons'

const { TextArea } = Input
const { Text } = Typography
const UUID_RE = /^(d-)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const RETRY_DELAYS = [2000, 5000, 10000]   // automatic retries after a temporary problem
const REQUEST_TIMEOUT_MS = 90000
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// web addresses inside a message become clickable links (a trailing full stop or bracket is not part of the address)
function withLinks(text) {
  return String(text).split(/(https?:\/\/[^\s)]+[^\s).,;])/g).map((part, i) =>
    i % 2 ? <a key={i} href={part} target="_blank" rel="noopener noreferrer">{part}</a> : part)
}

// What the researcher is told, in plain words, for each kind of problem.
function explain(error) {
  switch (error?.code) {
    case 'NO_TOKEN':
    case 'DENIED':
      return { text: 'Your EBRAINS login does not give access to the bucket right now.', steps: 'Please download a draft first (the bar at the top), then log in again and press “Try again”. If it still fails, check that you have access to this dataset’s bucket.' }
    case 'EMPTY':
      return { text: 'No files were found in your bucket yet.', steps: 'Upload your data to the bucket first, then press “Try again”. You can also write the file structure by hand below.' }
    case 'NOT_FOUND':
      return { text: 'The bucket of this dataset was not found.', steps: 'Please check with your curator that the data have been uploaded to the bucket of this dataset version.' }
    case 'BAD_ID':
      return { text: 'The dataset version ID of this submission is not valid.', steps: 'Please contact your curator.' }
    default:
      return { text: error?.error || 'The bucket could not be read.', steps: 'This is usually temporary. Press “Try again”, or write the file structure by hand below.' }
  }
}

// Reads (names and sizes only, never contents) the files in the dataset's EBRAINS bucket.
// The dataset UUID comes from the Zammad ticket, so the researcher is never asked for it:
// the read starts by itself and the result is handed to the parent through `onResult`,
// which fills the editable "File structure" field and the format table.
// Temporary problems are retried automatically; whatever is still missing afterwards is shown, with a button to fix it.
// `treeText` and `summaryText` are the current texts of the file structure and Summary fields, so the panel can
// see whether the result actually arrived there; `onFillTree` / `onAddSentence` put it there on request.
export default function BucketStructurePanel({ datasetVersionId, onResult, onListing, treeText = '', summaryText = '', onFillTree, onAddSentence, standards = [] }) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [meta,    setMeta]    = useState(null)
  const [token,   setToken]   = useState('')
  const [manual,  setManual]  = useState('')
  const [attempt, setAttempt] = useState(0)
  const [slow,    setSlow]    = useState(false)
  const [hiddenSentence, setHiddenSentence] = useState('')
  const ranFor = useRef('')
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])

  // one request; says whether a new try could help
  const requestOnce = async (useToken) => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS)
    try {
      const res = await fetch('/api/bucket/structure', {
        method: 'POST', credentials: 'same-origin', signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasetVersionId: String(datasetVersionId).trim(), token: useToken ? token.trim() || undefined : undefined, standards }),
      })
      const body = await res.json().catch(() => null)
      if (res.ok && body?.text) return { ok: true, body }
      const transient = !body || res.status >= 500 || res.status === 429 || (res.ok && !body.text)
      return { ok: false, status: res.status, body: body || { error: 'The server did not answer properly.' }, transient }
    } catch (e) {
      return { ok: false, status: 0, transient: true,
        body: { error: e.name === 'AbortError' ? 'The bucket took too long to answer.' : 'Could not reach the wizard server.' } }
    } finally {
      clearTimeout(timer)
    }
  }

  const load = async (useToken, byHand = false) => {
    setLoading(true); setError(null); setAttempt(0); setSlow(false)
    const slowTimer = setTimeout(() => alive.current && setSlow(true), 15000)
    let r
    for (let i = 0; i <= RETRY_DELAYS.length; i++) {
      if (alive.current) setAttempt(i)
      r = await requestOnce(useToken)
      if (r.ok || !r.transient || i === RETRY_DELAYS.length || !alive.current) break
      if (alive.current) setAttempt(i + 1)   // show at once that another try is coming
      await sleep(RETRY_DELAYS[i])
      if (!alive.current) break
    }
    clearTimeout(slowTimer)
    if (!alive.current) return   // the step was closed meanwhile; opening it again reads the bucket again
    if (r.ok) {
      setMeta(r.body)
      onListing?.(r.body.text)
      onResult?.(r.body, { manual: byHand })
    } else {
      setError({ ...r.body, status: r.status, at: new Date().toISOString() })
    }
    setLoading(false)
  }

  // start automatically, once per dataset
  useEffect(() => {
    const id = String(datasetVersionId || '').trim()
    if (!UUID_RE.test(id) || ranFor.current === id) return
    ranFor.current = id
    load(false)
  }, [datasetVersionId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!UUID_RE.test(String(datasetVersionId || '').trim())) return null

  const box = { background: '#f7f9fb', border: '1px solid #d9e2ec', borderRadius: 8, padding: '10px 16px', margin: '4px 0 16px' }
  const sentence = (meta?.summarySentence || '').trim()
  const treeMissing = !!meta && !!meta.tree && !String(treeText || '').trim()
  const sentenceMissing = !!sentence && !String(summaryText || '').includes('The shared data comprise')
  const info = error ? explain(error) : null
  const details = error ? `Bucket read problem\nTime: ${error.at}\nDataset version: ${String(datasetVersionId).trim()}\nHTTP status: ${error.status || 'none'}\nCode: ${error.code || 'none'}\nMessage: ${error.error || ''}` : ''

  return (
    <div style={box}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <ApartmentOutlined />
        {loading && (
          <>
            <Spin size="small" />
            <Text style={{ fontSize: 13 }}>
              {attempt === 0
                ? 'Reading the file names from your dataset’s bucket…'
                : `The bucket did not answer yet. Trying again automatically (attempt ${attempt + 1} of ${RETRY_DELAYS.length + 1})…`}
              {slow && attempt === 0 ? ' Large buckets can take a minute.' : ''}
            </Text>
          </>
        )}
        {!loading && meta && !error && (
          <Text style={{ fontSize: 13 }}>
            The file structure and format table below were drafted from your bucket ({meta.truncated ? 'at least ' : ''}{meta.totals.files} files, {meta.totals.size}
            {meta.truncated ? ' read so far' : ''}). Only names and sizes were read. Please edit them.
          </Text>
        )}
        {!loading && (
          <Button size="small" icon={<ReloadOutlined />} onClick={() => load(!!error, true)}>
            {meta && !error ? 'Read the bucket again' : 'Try again'}
          </Button>
        )}
      </div>

      {!loading && !error && meta?.truncated && (
        <Alert type="warning" showIcon style={{ marginTop: 8 }}
          message="Your bucket is very large, so it was read only in part."
          description="The folders and the first files of each folder were read. Similar files are already summarised in the structure (for example “img_XXXX.tif [at least 700 files …]”), but the list is incomplete: some files, file formats and the exact number of files may be missing, so no automatic sentence about the number of files was added to the Summary. Please complete the structure and the format table by hand, or paste a listing of your folders in the box below (Windows: tree /F, Mac/Linux: find . -type f)." />
      )}

      {/* standard-specific findings (BIDS, NWB): what the bucket lacks compared with the standard ticked in Dataset part 1 */}
      {!loading && !error && ['BIDS', 'NWB'].map(std => {
        const checks = (meta?.checks || []).filter(c => (c.standard || 'BIDS') === std)
        if (!checks.length) return null
        const problems = checks.filter(c => c.level !== 'info')
        const infos = checks.filter(c => c.level === 'info')
        const hasError = problems.some(c => c.level === 'error')
        const a = std === 'NWB' ? 'an' : 'a'
        const example = std === 'BIDS'
          ? <> An example of a BIDS folder structure: <a href="https://bids.neuroimaging.io/getting_started/folders_and_files/folders.html" target="_blank" rel="noopener noreferrer">BIDS folders and files</a>.</>
          : <> About the NWB format: <a href="https://nwb-overview.readthedocs.io" target="_blank" rel="noopener noreferrer">NWB overview</a>.</>
        return (
          <Alert key={std} type={hasError ? 'error' : problems.length ? 'warning' : 'success'} showIcon style={{ marginTop: 8 }}
            message={problems.length
              ? `You ticked ${std} in Dataset part 1. The bucket does not fully look like ${a} ${std} dataset (${problems.length} point${problems.length === 1 ? '' : 's'}).`
              : `You ticked ${std} in Dataset part 1. The folder and file names look like ${a} ${std} dataset.`}
            description={
              <div>
                {problems.length > 0 && <ul style={{ margin: '4px 0 6px 18px', padding: 0 }}>{problems.map((c, i) => <li key={i}>{withLinks(c.text)}</li>)}</ul>}
                {infos.map((c, i) => <div key={i} style={{ fontSize: 12, opacity: 0.8 }}>{withLinks(c.text)}</div>)}
                {problems.length > 0 && <div style={{ fontSize: 12, marginTop: 4 }}>Either fix this in the bucket and press “Read the bucket again”, or untick {std} in Dataset part 1 if the data do not follow it.{example}</div>}
              </div>
            } />
        )
      })}

      {/* the result was read but did not arrive in the fields: say so, and offer the fix */}
      {!loading && !error && meta && treeMissing && (
        <Alert type="warning" showIcon style={{ marginTop: 8 }}
          message="The file structure field is still empty."
          action={<Button size="small" onClick={() => onFillTree?.(meta.tree)}>Fill it in from the bucket</Button>} />
      )}
      {!loading && !error && meta && sentenceMissing && hiddenSentence !== sentence && (
        <Alert type="info" showIcon closable onClose={() => setHiddenSentence(sentence)} style={{ marginTop: 8 }}
          message="The Summary does not yet contain a sentence about the files in your bucket."
          description={sentence}
          action={<Button size="small" onClick={() => onAddSentence?.(sentence)}>Add it to the Summary</Button>} />
      )}

      {error && !loading && (
        <div style={{ marginTop: 8 }}>
          <Alert type="warning" showIcon style={{ marginBottom: 8 }}
            message={info.text}
            description={<>{info.steps}
              <div style={{ marginTop: 4, fontSize: 12 }}>
                <a onClick={() => navigator.clipboard?.writeText(details)}>Copy technical details</a> for the curators
                {error.status ? ` (status ${error.status}${error.code ? `, ${error.code}` : ''})` : ''}.
              </div></>} />
          <TextArea value={manual} onChange={e => { setManual(e.target.value); onListing?.(e.target.value) }}
            autoSize={{ minRows: 2, maxRows: 8 }} style={{ fontFamily: 'monospace', fontSize: 12, marginBottom: 8 }}
            placeholder="Optional: paste a listing of your folders and files (Windows: tree /F, Mac/Linux: find . -type f)" />
          {(error.code === 'NO_TOKEN' || error.code === 'DENIED') && (
            <Input.Password value={token} onChange={e => setToken(e.target.value)} style={{ maxWidth: 420 }}
              placeholder="Optional: EBRAINS access token (used only for this request, not stored)" />
          )}
        </div>
      )}
    </div>
  )
}
