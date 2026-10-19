import { useState } from 'react'
import { Button, Input, Typography, Alert, Upload } from 'antd'
import { RobotOutlined, FileTextOutlined } from '@ant-design/icons'
import { askAi, useAiSettings } from './aiClient'
import AiKeyButton from './AiKeyButton'

const { TextArea } = Input
const { Text } = Typography

const MAX_BYTES = 10 * 1024 * 1024
const MAX_TEXT_CHARS = 150000
const toBase64 = (file) => new Promise((res, rej) => {
  const r = new FileReader()
  r.onload = () => res(String(r.result).split(',')[1] || '')
  r.onerror = rej
  r.readAsDataURL(file)
})
async function docxText(file) {
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const xml = await zip.file('word/document.xml')?.async('string')
  if (!xml) throw new Error('This Word file could not be read.')
  return xml.replace(/<\/w:p>/g, '\n').replace(/<w:tab\/>/g, '\t').replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
}

// ONE place for "draft with my own AI": the key button and a single "Draft the text sections"
// button at the top of the page. Each draft is shown for review; nothing is written into the
// form until the researcher presses "Use this draft" for that section.
export default function AiDraftAll({ sections, buildPrompt, onUse }) {
  const settings = useAiSettings()
  const [busy, setBusy] = useState(false)
  const [drafts, setDrafts] = useState({})   // key -> { text, error }
  const [ms, setMs] = useState(null)         // manuscript: { name, text } or { name, base64 } (PDF)
  const [msError, setMsError] = useState('')

  const loadManuscript = async (file) => {
    setMsError('')
    try {
      if (file.size > MAX_BYTES) throw new Error('The file is larger than 10 MB.')
      const n = file.name.toLowerCase()
      if (n.endsWith('.pdf')) setMs({ name: file.name, base64: await toBase64(file) })
      else if (n.endsWith('.docx')) setMs({ name: file.name, text: (await docxText(file)).slice(0, MAX_TEXT_CHARS) })
      else if (/\.(txt|md)$/.test(n)) setMs({ name: file.name, text: (await file.text()).slice(0, MAX_TEXT_CHARS) })
      else throw new Error('Please upload a PDF, Word (.docx), .txt or .md file.')
    } catch (e) { setMs(null); setMsError(e.message || 'Could not read the file.') }
    return false   // stays in the browser; it is only sent to your AI provider when you press Draft
  }
  const withManuscript = (prompt) => {
    if (!ms) return prompt
    return `${prompt}\n\n---\nThe researcher also supplied the manuscript describing this dataset${ms.text ? ' (below)' : ' (attached)'}. Use it as an additional SOURCE OF FACTS for this section. Where it conflicts with the answers above, the answers above win. Do not copy long passages, do not take results or claims that are not about the shared data, and never invent anything that is in neither source.${ms.text ? `\n\n<manuscript name="${ms.name}">\n${ms.text}\n</manuscript>` : ''}`
  }

  const run = async () => {
    setBusy(true); setDrafts({})
    for (const s of sections) {
      try {
        const text = await askAi(withManuscript(buildPrompt(s.key)), settings, { attachments: ms?.base64 ? [{ name: ms.name, base64: ms.base64 }] : [] })
        setDrafts(d => ({ ...d, [s.key]: { text } }))
      } catch (e) {
        setDrafts(d => ({ ...d, [s.key]: { error: e.message } }))
      }
    }
    setBusy(false)
  }
  const set = (key, patch) => setDrafts(d => ({ ...d, [key]: { ...d[key], ...patch } }))
  const drop = (key) => setDrafts(d => { const n = { ...d }; delete n[key]; return n })

  return (
    <div style={{ background: '#f7f9fb', border: '1px solid #d9e2ec', borderRadius: 8, padding: '12px 16px', margin: '0 0 20px' }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <Text strong><RobotOutlined style={{ marginRight: 6 }} />Draft with your own AI</Text>
        <AiKeyButton />
        <Button icon={<RobotOutlined />} loading={busy} disabled={!settings?.key} onClick={run}>
          Draft Summary, Methods, Data records and Usage notes
        </Button>
        {!settings?.key && <Text style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>Add your AI key first.</Text>}
      </div>
      {settings?.key && (
        <div style={{ marginTop: 8, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Upload accept=".pdf,.docx,.txt,.md" showUploadList={false} beforeUpload={loadManuscript}>
            <Button size="small" icon={<FileTextOutlined />}>{ms ? 'Replace the manuscript' : 'Add your manuscript (optional)'}</Button>
          </Upload>
          {ms && <><Text style={{ fontSize: 12 }}>{ms.name}</Text><a style={{ fontSize: 12 }} onClick={() => setMs(null)}>remove</a></>}
          <Text style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>
            PDF, Word, .txt or .md. It is sent only to your AI provider with your key, never to the wizard server.
          </Text>
        </div>
      )}
      {msError && <Alert type="warning" showIcon style={{ marginTop: 6 }} message={msError} />}
      <Text style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)', display: 'block', marginTop: 6 }}>
        The drafts are built from what you have already written. Nothing changes in the form until you press "Use this draft".
      </Text>

      {sections.map(s => {
        const d = drafts[s.key]
        if (!d) return null
        return (
          <div key={s.key} style={{ marginTop: 12 }}>
            <Text strong style={{ fontSize: 13 }}>{s.label}</Text>
            {d.error
              ? <Alert type="warning" showIcon style={{ marginTop: 4 }} message={d.error} />
              : (
                <>
                  <TextArea value={d.text} onChange={e => set(s.key, { text: e.target.value })}
                    autoSize={{ minRows: 4, maxRows: 14 }} style={{ marginTop: 4 }} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <Button size="small" type="primary" onClick={() => { onUse(s.field, d.text); drop(s.key) }}>
                      Use this draft (replaces the current text)
                    </Button>
                    <Button size="small" onClick={() => drop(s.key)}>Discard</Button>
                  </div>
                </>
              )}
          </div>
        )
      })}
    </div>
  )
}
