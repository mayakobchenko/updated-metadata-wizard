import { Input } from 'antd'

const { TextArea } = Input
export const countWords = (t) => (String(t || '').trim().match(/\S+/g) || []).length

// TextArea with a word counter ABOVE the box, right-aligned, so it never overlaps the hint text
// or the box. Used as the single child of a Form.Item (value/onChange are injected by antd).
export default function WordCountArea({ value, onChange, max, ...rest }) {
  const n = countWords(value)
  const over = max && n > max
  return (
    <div>
      <div style={{ textAlign: 'right', fontSize: 12, lineHeight: '18px', marginBottom: 2, color: over ? '#cf1322' : 'rgba(0,0,0,0.55)', fontWeight: over ? 600 : 400 }}>
        {max ? `${n} / ${max} words` : `${n} ${n === 1 ? 'word' : 'words'}`}
      </div>
      <TextArea value={value} onChange={onChange} {...rest} />
    </div>
  )
}
