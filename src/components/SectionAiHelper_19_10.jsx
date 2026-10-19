import { useState } from 'react'
import { Button, Input, Typography, Alert } from 'antd'
import { CopyOutlined, RobotOutlined } from '@ant-design/icons'
import { askAi, useAiSettings } from './aiClient'

const { TextArea } = Input
const { Text } = Typography

// Small toolbar shown under a section's text box:
//   [Copy prompt for this section]  [Draft with my AI]
// `buildPrompt()` is called on click so it always sees the latest answers.
export default function SectionAiHelper({ label, buildPrompt, onUse, onNeedKey }) {
  const settings = useAiSettings()
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')

  const copy = async () => {
    const text = buildPrompt()
    try { await navigator.clipboard.writeText(text) }
    catch {
      const ta = document.createElement('textarea')
      ta.value = text; document.body.appendChild(ta); ta.select()
      document.execCommand('copy'); document.body.removeChild(ta)
    }
    setCopied(true); setTimeout(() => setCopied(false), 2500)
  }

  const run = async () => {
    if (!settings?.key) { onNeedKey?.(); return }
    setBusy(true); setError(''); setDraft('')
    try { setDraft(await askAi(buildPrompt(), settings)) }
    catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }

  return (
    <div style={{ margin: '-8px 0 18px' }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button size="small" icon={<CopyOutlined />} onClick={copy}>
          {copied ? 'Prompt copied!' : `Copy AI prompt for ${label}`}
        </Button>
        <Button size="small" icon={<RobotOutlined />} loading={busy} onClick={run}>
          {settings?.key ? 'Draft with my AI' : 'Draft with my AI key…'}
        </Button>
      </div>
      {error && <Alert type="warning" showIcon style={{ marginTop: 8 }} message={error} />}
      {draft && (
        <div style={{ marginTop: 8 }}>
          <Text style={{ fontSize: 12 }}>
            Draft from your AI — please read it and correct anything that is not true for your data.
          </Text>
          <TextArea value={draft} onChange={e => setDraft(e.target.value)} autoSize={{ minRows: 4, maxRows: 14 }} style={{ marginTop: 4 }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <Button size="small" type="primary" onClick={() => { onUse(draft); setDraft('') }}>
              Replace the text above with this draft
            </Button>
            <Button size="small" onClick={() => setDraft('')}>Discard</Button>
          </div>
        </div>
      )}
    </div>
  )
}
