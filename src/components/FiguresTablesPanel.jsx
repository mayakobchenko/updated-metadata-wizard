import { useState } from 'react'
import { Button, Input, Select, Typography, Alert, Upload } from 'antd'
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons'
import {
  useFigures, addFigure, updateFigure, removeFigure, labelFor, parseDelimited, PLACEMENTS,
  MAX_ITEMS, MAX_IMAGE_BYTES, MAX_TABLE_ROWS, MAX_TABLE_COLS,
} from './figuresStore'

const { Text } = Typography
const { TextArea } = Input

// "hypo_atlas_registration_fig1.png" -> "Hypo atlas registration." (a starting point only)
const STOP = new Set(['fig', 'figure', 'table', 'tab', 'img', 'image', 'final', 'v1', 'v2', 'copy', 'new'])
export function suggestCaption(fileName, kind) {
  const words = String(fileName || '').replace(/\.[^.]+$/, '').replace(/([a-z])([A-Z])/g, '$1 $2').split(/[\s_.\-]+/)
    .filter(w => w && !/^\d+$/.test(w) && !STOP.has(w.toLowerCase()))
  if (!words.length) return ''
  const t = words.join(' ').toLowerCase()
  return `${kind === 'table' ? 'Table of' : 'Figure showing'} ${t}.`
}

const readAsDataUrl = (file) => new Promise((resolve, reject) => {
  const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file)
})
const readAsText = (file) => new Promise((resolve, reject) => {
  const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsText(file)
})
const imageSize = (dataUrl) => new Promise((resolve, reject) => {
  const img = new Image(); img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight }); img.onerror = reject; img.src = dataUrl
})

// Upload figures (PNG/JPG) and tables (CSV/TSV, or a picture of a table) with captions. They are
// placed in the Word file after the chosen section. Kept in this browser tab only.
export default function FiguresTablesPanel() {
  const items = useFigures()
  const [error, setError] = useState('')

  const handleFile = async (file) => {
    setError('')
    if (items.length >= MAX_ITEMS) { setError(`At most ${MAX_ITEMS} figures/tables can be added.`); return false }
    const name = file.name
    const lower = name.toLowerCase()
    try {
      if (/\.(png|jpe?g)$/.test(lower)) {
        if (file.size > MAX_IMAGE_BYTES) { setError(`"${name}" is larger than ${MAX_IMAGE_BYTES / 1024 / 1024} MB. Please reduce its size.`); return false }
        const dataUrl = await readAsDataUrl(file)
        const { width, height } = await imageSize(dataUrl)
        addFigure({ id: `f${Date.now()}${Math.random().toString(36).slice(2, 6)}`, kind: 'figure', fileName: name,
          caption: '', placement: 'summary', image: { dataUrl, width, height, type: /png$/.test(lower) ? 'png' : 'jpg' } })
      } else if (/\.(csv|tsv|txt)$/.test(lower)) {
        const rows = parseDelimited(await readAsText(file))
        if (!rows.length) { setError(`"${name}" contains no rows.`); return false }
        if (rows.length > MAX_TABLE_ROWS || Math.max(...rows.map(r => r.length)) > MAX_TABLE_COLS) {
          setError(`"${name}" is too large for a table in the document (max ${MAX_TABLE_ROWS} rows and ${MAX_TABLE_COLS} columns). Please include a smaller table or a picture of it.`)
          return false
        }
        addFigure({ id: `t${Date.now()}${Math.random().toString(36).slice(2, 6)}`, kind: 'table', fileName: name,
          caption: '', placement: 'methods', rows })
      } else {
        setError(`"${name}": please upload a PNG or JPG picture (figure), or a CSV/TSV file (table).`)
      }
    } catch {
      setError(`Could not read "${name}".`)
    }
    return false   // never upload anywhere: the file stays in the browser
  }

  return (
    <div style={{ background: '#f7f9fb', border: '1px solid #d9e2ec', borderRadius: 8, padding: '14px 18px', margin: '4px 0 20px' }}>
      <Text strong style={{ display: 'block', marginBottom: 4 }}>Figures and tables (optional)</Text>
      <Text style={{ fontSize: 13, color: '#444', display: 'block', marginBottom: 10 }}>
        Add figures (PNG, JPG) or tables (CSV, TSV, or a picture of a table) with a caption. They are
        placed in the Word file after the section you choose. The files stay in your browser and are
        only used when you press <b>Generate Data Descriptor</b>; they are not part of the wizard JSON,
        so they are lost if you reload the page.
      </Text>

      <Upload accept=".png,.jpg,.jpeg,.csv,.tsv,.txt" showUploadList={false} multiple beforeUpload={handleFile}>
        <Button icon={<UploadOutlined />}>Add a figure or table</Button>
      </Upload>

      {error && <Alert type="warning" showIcon style={{ marginTop: 8 }} message={error} closable onClose={() => setError('')} />}

      {items.map(item => (
        <div key={item.id} style={{ border: '1px solid #e1e8ef', background: '#fff', borderRadius: 6, padding: 10, marginTop: 10 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
            <Text strong>{labelFor(items, item)}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{item.fileName}</Text>
            <span style={{ flex: 1 }} />
            <Select size="small" value={item.placement} onChange={v => updateFigure(item.id, { placement: v })}
              options={PLACEMENTS} style={{ width: 230 }} />
            <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => removeFigure(item.id)} />
          </div>
          {item.image
            ? <img src={item.image.dataUrl} alt={item.fileName} style={{ maxWidth: '100%', maxHeight: 180, display: 'block', marginBottom: 6 }} />
            : (
              <div style={{ overflowX: 'auto', marginBottom: 6 }}>
                <table style={{ fontSize: 11, borderCollapse: 'collapse' }}>
                  <tbody>
                    {item.rows.slice(0, 5).map((r, ri) => (
                      <tr key={ri}>{r.map((c, ci) => (
                        <td key={ci} style={{ border: '1px solid #d9d9d9', padding: '1px 6px', fontWeight: ri === 0 ? 600 : 400 }}>{c}</td>
                      ))}</tr>
                    ))}
                  </tbody>
                </table>
                {item.rows.length > 5 && <Text type="secondary" style={{ fontSize: 11 }}>… {item.rows.length - 5} more rows</Text>}
              </div>
            )}
          <TextArea value={item.caption} onChange={e => updateFigure(item.id, { caption: e.target.value })}
            autoSize={{ minRows: 1, maxRows: 4 }} status={item.caption.trim() ? '' : 'error'}
            placeholder={`Caption for this ${item.kind} (required)`} />
          {!item.caption.trim() && (
            <div style={{ fontSize: 11 }}>
              <Text type="danger">Please add a caption. </Text>
              {suggestCaption(item.fileName, item.kind) && (
                <a onClick={() => updateFigure(item.id, { caption: suggestCaption(item.fileName, item.kind) })}>
                  Start from the file name: “{suggestCaption(item.fileName, item.kind)}”
                </a>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
