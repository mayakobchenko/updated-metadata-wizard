import { useState } from 'react'
import { Button, Input, Typography, Alert } from 'antd'
import { RobotOutlined } from '@ant-design/icons'
import { askAi, useAiSettings } from './aiClient'

const { TextArea } = Input
const { Text } = Typography

// Small toolbar shown under a section's text box:
//   [Draft with my AI]   (the single copy-prompt button lives in the AI box at the bottom)
// `buildPrompt()` is called on click so it always sees the latest answers.
export default function SectionAiHelper({ label, buildPrompt, onUse, onNeedKey }) {
  const settings = useAiSettings()
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')

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
