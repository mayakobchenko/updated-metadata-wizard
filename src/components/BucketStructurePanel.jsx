import { useState, useEffect } from 'react'
import { Input, Button, Typography, Alert } from 'antd'
import { ApartmentOutlined, CopyOutlined, ImportOutlined } from '@ant-design/icons'

const { TextArea } = Input
const { Text } = Typography
const UUID_RE = /^(d-)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Reads (names and sizes only) the files the user has uploaded to the dataset's
// EBRAINS bucket and drafts the "file structure" part of DATA RECORDS.
export default function BucketStructurePanel({ datasetVersionId, onInsert, onListing, onResult }) {
  const [uuid,      setUuid]      = useState(datasetVersionId || '')
  const [token,     setToken]     = useState('')
  const [showToken, setShowToken] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)
  const [text,      setText]      = useState('')
  const [meta,      setMeta]      = useState(null)
  const [copied,    setCopied]    = useState(false)
  const [inserted,  setInserted]  = useState(false)

  // follow the wizard's value until the user types their own
  useEffect(() => { if (datasetVersionId && !uuid) setUuid(datasetVersionId) }, [datasetVersionId]) // eslint-disable-line

  const generate = async () => {
    setLoading(true); setError(null); setInserted(false)
    try {
      const res = await fetch('/api/bucket/structure', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasetVersionId: uuid.trim(), token: token.trim() || undefined }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body)
        if (body.code === 'NO_TOKEN' || body.code === 'DENIED') setShowToken(true)
        return
      }
      setText(body.text)
      setMeta(body)
      onListing?.(body.text)          // also feeds the "AI assistant" prompts
      onResult?.(body)
    } catch {
      setError({ error: 'Could not reach the wizard server. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const copy = async () => {
    try { await navigator.clipboard.writeText(text) } catch { /* ignore */ }
    setCopied(true); setTimeout(() => setCopied(false), 2500)
  }

  const insert = () => { onInsert({ tree: meta.tree, formats: meta.formats }); setInserted(true) }

  return (
    <div style={{ background: '#f7f9fb', border: '1px solid #d9e2ec', borderRadius: 8, padding: '14px 18px', margin: '4px 0 20px' }}>
      <Text strong style={{ display: 'block', marginBottom: 4 }}>
        <ApartmentOutlined style={{ marginRight: 6 }} />
        Generate the file structure from your EBRAINS bucket
      </Text>
      <Text style={{ fontSize: 13, color: '#444', display: 'block', marginBottom: 10 }}>
        If you have already uploaded your data to your dataset's bucket, the wizard can read the
        file and folder <b>names and sizes</b> (never the contents) and draft the folder layout and
        the table of file formats that the template asks for. After adding it you can edit both below:
        describe what each file contains in the square brackets and which software created each format.
      </Text>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
        <Input value={uuid} onChange={e => setUuid(e.target.value)} style={{ maxWidth: 420, fontFamily: 'monospace' }}
          placeholder="Dataset version UUID (the bucket is named d-<uuid>)" />
        <Button type="primary" loading={loading} disabled={!UUID_RE.test(uuid.trim())} onClick={generate}>
          Generate file structure
        </Button>
        {!showToken && <Button type="link" onClick={() => setShowToken(true)}>Use an access token instead</Button>}
      </div>

      {showToken && (
        <div style={{ marginBottom: 8 }}>
          <Input.Password value={token} onChange={e => setToken(e.target.value)} style={{ maxWidth: 420 }}
            placeholder="Optional: EBRAINS access token (only used for this request, not stored)" />
        </div>
      )}

      {error && (
        <Alert type="warning" showIcon style={{ marginBottom: 8 }}
          message={error.error || 'Something went wrong.'}
          description="You can still paste a folder listing manually in the AI assistant box further down." />
      )}

      {text && (
        <>
          {meta && (
            <Text style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              {meta.totals.files} files, {meta.totals.size} in {meta.bucket}
              {meta.truncated ? ' (the bucket is larger; only the first files are shown)' : ''}. You can edit everything after adding it below.
            </Text>
          )}
          <TextArea value={text} readOnly
            autoSize={{ minRows: 8, maxRows: 24 }} wrap="off"
            style={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre' }} />
          <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
            <Button icon={<ImportOutlined />} onClick={insert}>
              {inserted ? 'Added to the fields below' : 'Use as file structure and format table'}
            </Button>
            <Button icon={<CopyOutlined />} onClick={copy}>{copied ? 'Copied!' : 'Copy'}</Button>
          </div>
        </>
      )}
    </div>
  )
}
