import { useState } from 'react'
import { Button, Modal, Upload, Input, Radio, Alert, Typography, Tag } from 'antd'
import { FileMarkdownOutlined } from '@ant-design/icons'
import { parseDescriptorMarkdown, FIELD_LABELS } from './ddMarkdownImport'
import { countWords } from './WordCountArea'

const { Text } = Typography
const { TextArea } = Input

// Import a Markdown result written by the skill or an AI chat. Every field is compared with what is
// already in the wizard and the user chooses per field: keep mine / use imported.
export default function DdMarkdownImport({ getCurrent, getCurrentFormats, onApply }) {
  const [open, setOpen] = useState(false)
  const [pasted, setPasted] = useState('')
  const [parsed, setParsed] = useState(null)
  const [choice, setChoice] = useState({})

  const analyse = (text) => {
    const p = parseDescriptorMarkdown(text)
    const rows = Object.entries(p.fields).filter(([, v]) => v)
    const ch = {}
    rows.forEach(([f, v]) => {
      const cur = (getCurrent(f) || '').trim()
      ch[f] = !cur ? 'imported' : (cur === v.trim() ? 'same' : 'mine')
    })
    if (p.formats) ch.dataRecordsFormats = (getCurrentFormats() || []).length ? 'mine' : 'imported'
    setParsed(p); setChoice(ch)
  }

  const reset = () => { setOpen(false); setPasted(''); setParsed(null); setChoice({}) }
  const apply = () => {
    const patch = {}
    Object.entries(parsed.fields).forEach(([f, v]) => { if (choice[f] === 'imported') patch[f] = v })
    const formats = parsed.formats && choice.dataRecordsFormats === 'imported' ? parsed.formats : null
    onApply(patch, formats)
    reset()
  }
  const rows = parsed ? Object.entries(parsed.fields).filter(([, v]) => v) : []
  const nImported = Object.values(choice).filter(c => c === 'imported').length

  return (
    <>
      <Button icon={<FileMarkdownOutlined />} onClick={() => setOpen(true)}>Import a Markdown result</Button>
      <Modal open={open} onCancel={reset} width={820} title="Import a data descriptor written as Markdown"
        okText={`Apply ${nImported} field${nImported === 1 ? '' : 's'}`} onOk={apply} okButtonProps={{ disabled: !parsed || !nImported }}>
        {!parsed ? (
          <>
            <Text style={{ display: 'block', marginBottom: 8 }}>
              Paste the Markdown that the skill or the AI chat produced, or choose the .md file. You will see every
              section next to what you have now and decide for each one. Nothing is changed until you press Apply.
            </Text>
            <Upload accept=".md,.markdown,.txt" showUploadList={false}
              beforeUpload={(f) => { f.text().then(analyse); return false }}>
              <Button>Choose a .md file</Button>
            </Upload>
            <TextArea rows={10} style={{ marginTop: 10 }} value={pasted} onChange={e => setPasted(e.target.value)}
              placeholder="…or paste the Markdown here" />
            <Button type="primary" style={{ marginTop: 8 }} disabled={!pasted.trim()} onClick={() => analyse(pasted)}>Compare</Button>
          </>
        ) : (
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {parsed.warnings.map((w, i) => <Alert key={i} type="warning" showIcon style={{ marginBottom: 6 }} message={w} />)}
            {rows.map(([f, v]) => {
              const cur = (getCurrent(f) || '').trim()
              return (
                <div key={f} style={{ border: '1px solid #e1e8ef', borderRadius: 6, padding: 10, marginBottom: 10 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <Text strong>{FIELD_LABELS[f] || f}</Text>
                    <Tag>{countWords(v)} words</Tag>
                    {choice[f] === 'same' && <Tag color="green">identical</Tag>}
                    <span style={{ flex: 1 }} />
                    {choice[f] !== 'same' && (
                      <Radio.Group size="small" value={choice[f]} onChange={e => setChoice({ ...choice, [f]: e.target.value })}>
                        <Radio.Button value="mine" disabled={!cur}>Keep mine</Radio.Button>
                        <Radio.Button value="imported">Use imported</Radio.Button>
                      </Radio.Group>
                    )}
                  </div>
                  {choice[f] !== 'same' && (
                    <div style={{ display: 'flex', gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>Now in the wizard</Text>
                        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, background: '#fafafa', padding: 6, margin: 0, maxHeight: 160, overflow: 'auto' }}>{cur || '(empty)'}</pre>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>Imported</Text>
                        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, background: '#f6ffed', padding: 6, margin: 0, maxHeight: 160, overflow: 'auto' }}>{v}</pre>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            {parsed.formats && (
              <div style={{ border: '1px solid #e1e8ef', borderRadius: 6, padding: 10, marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Text strong>{FIELD_LABELS.dataRecordsFormats}</Text><Tag>{parsed.formats.length} rows</Tag>
                  <span style={{ flex: 1 }} />
                  <Radio.Group size="small" value={choice.dataRecordsFormats} onChange={e => setChoice({ ...choice, dataRecordsFormats: e.target.value })}>
                    <Radio.Button value="mine" disabled={!(getCurrentFormats() || []).length}>Keep mine</Radio.Button>
                    <Radio.Button value="imported">Use imported</Radio.Button>
                  </Radio.Group>
                </div>
              </div>
            )}
            {!rows.length && <Alert type="info" message="Nothing to import was found." />}
          </div>
        )}
      </Modal>
    </>
  )
}
