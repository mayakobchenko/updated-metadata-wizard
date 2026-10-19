import { useState } from 'react'
import { Button, Input, Typography, Alert } from 'antd'
import { RobotOutlined } from '@ant-design/icons'
import { askAi, useAiSettings } from './aiClient'
import AiKeyButton from './AiKeyButton'

const { TextArea } = Input
const { Text } = Typography

// ONE place for "draft with my own AI": the key button and a single "Draft the text sections"
// button at the top of the page. Each draft is shown for review; nothing is written into the
// form until the researcher presses "Use this draft" for that section.
export default function AiDraftAll({ sections, buildPrompt, onUse }) {
  const settings = useAiSettings()
  const [busy, setBusy] = useState(false)
  const [drafts, setDrafts] = useState({})   // key -> { text, error }

  const run = async () => {
    setBusy(true); setDrafts({})
    for (const s of sections) {
      try {
        const text = await askAi(buildPrompt(s.key), settings)
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
