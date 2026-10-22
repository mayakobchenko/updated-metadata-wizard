import { useState, useEffect, useRef } from 'react'
import { Input, Button, Typography, Alert, Spin } from 'antd'
import { ApartmentOutlined, ReloadOutlined } from '@ant-design/icons'

const { TextArea } = Input
const { Text } = Typography
const UUID_RE = /^(d-)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Reads (names and sizes only, never contents) the files in the dataset's EBRAINS bucket.
// The dataset UUID comes from the Zammad ticket, so the researcher is never asked for it:
// the read starts by itself and the result is handed to the parent through `onResult`,
// which fills the editable "File structure" field and the format table.
// Only if the bucket cannot be read does this show a fallback (access token / pasted listing).
export default function BucketStructurePanel({ datasetVersionId, onResult, onListing }) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [meta,    setMeta]    = useState(null)
  const [token,   setToken]   = useState('')
  const [manual,  setManual]  = useState('')
  const ranFor = useRef('')

  const load = async (useToken, byHand = false) => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/bucket/structure', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasetVersionId: String(datasetVersionId).trim(), token: useToken ? token.trim() || undefined : undefined }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body.text) { setError(res.ok ? { error: 'The bucket answered with an unexpected result.' } : body); return }
      setMeta(body)
      onListing?.(body.text)
      onResult?.(body, { manual: byHand })
    } catch {
      setError({ error: 'Could not reach the wizard server.' })
    } finally {
      setLoading(false)
    }
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

  return (
    <div style={box}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <ApartmentOutlined />
        {loading && <><Spin size="small" /><Text style={{ fontSize: 13 }}>Reading the file names from your dataset's bucket…</Text></>}
        {!loading && meta && !error && (
          <Text style={{ fontSize: 13 }}>
            The file structure and format table below were drafted from your bucket ({meta.totals.files} files, {meta.totals.size}
            {meta.truncated ? '; the bucket is larger, only the first files are shown' : ''}). Only names and sizes were read. Please edit them.
          </Text>
        )}
        {!loading && (
          <Button size="small" icon={<ReloadOutlined />} onClick={() => load(!!error, true)}>
            {meta ? 'Read the bucket again' : 'Try again'}
          </Button>
        )}
      </div>

      {error && !loading && (
        <div style={{ marginTop: 8 }}>
          <Alert type="warning" showIcon style={{ marginBottom: 8 }}
            message={error.error || 'The bucket could not be read.'}
            description="You can fill in the file structure by hand below, paste a folder listing here, or try an access token." />
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
