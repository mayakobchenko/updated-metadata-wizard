import { useState } from 'react'
import { Button, Modal, Select, Input, Typography } from 'antd'
import { KeyOutlined } from '@ant-design/icons'
import { PROVIDERS, useAiSettings, setAiSettings } from './aiClient'

const { Text } = Typography

// Lets the researcher use their own AI account to draft a section. The key is kept in this
// browser tab only and is sent straight to the provider, never to the wizard server.
export default function AiKeyButton() {
  const settings = useAiSettings()
  const [open, setOpen] = useState(false)
  const [provider, setProvider] = useState(settings?.provider || 'anthropic')
  const [model, setModel] = useState(settings?.model || '')
  const [key, setKey] = useState(settings?.key || '')

  const save = () => {
    setAiSettings(key.trim() ? { provider, model: model.trim(), key: key.trim() } : null)
    setOpen(false)
  }
  const remove = () => { setAiSettings(null); setKey(''); setOpen(false) }

  return (
    <>
      <Button icon={<KeyOutlined />} onClick={() => setOpen(true)}>
        {settings?.key ? 'AI key set ✓' : 'Use my own AI key'}
      </Button>
      <Modal open={open} title="Use my own AI account" onCancel={() => setOpen(false)}
        onOk={save} okText="Save for this session"
        footer={(_, { OkBtn, CancelBtn }) => (
          <>
            {settings?.key && <Button danger onClick={remove}>Remove key</Button>}
            <CancelBtn /><OkBtn />
          </>
        )}>
        <Text style={{ fontSize: 13, display: 'block', marginBottom: 12 }}>
          With your own API key the wizard can draft a section for you, using the same prompt you
          can copy. The key stays in this browser tab (it is forgotten when you close it) and is sent
          directly to the provider you choose, never to the wizard server and never saved in the
          wizard JSON. The text of your answers is sent to that provider, so check that your
          institution allows it for your data.
        </Text>
        <Select value={provider} onChange={v => { setProvider(v); setModel('') }} style={{ width: '100%', marginBottom: 10 }}
          options={Object.entries(PROVIDERS).map(([value, p]) => ({ value, label: p.label }))} />
        <Input.Password value={key} onChange={e => setKey(e.target.value)} style={{ marginBottom: 10 }}
          placeholder={`API key (${PROVIDERS[provider].keyHint})`} autoComplete="off" />
        <Input value={model} onChange={e => setModel(e.target.value)}
          placeholder={`Model (default: ${PROVIDERS[provider].model})`} />
      </Modal>
    </>
  )
}
