// Creates the data descriptor Word file. Preferred route: write the descriptor as Markdown (skill format) and let
// the server fill the official EBRAINS Word template with the skill's script. If that is unavailable or reports a
// problem, the built-in JavaScript generator (generateDataDescriptorDocx) is used instead, so the user always gets a file.
import { generateDataDescriptorDocx } from './generateDataDescriptorDocx'
import { buildDescriptorMarkdown } from './ddMarkdownWriter'

const base64ToBlob = (b64) => {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
}

// args: { dd, fullData, figures } where dd holds the Data Descriptor fields (title, summary, authors, ...)
// returns { blob, filename, renderer: 'template' | 'builtin', notice }
export async function renderDataDescriptor({ dd, fullData = {}, figures = [] }) {
  const title = dd.title || fullData.dataset1?.dataTitle || 'dataset'
  const safe = String(title).replace(/[^a-z0-9]/gi, '_').slice(0, 40).toLowerCase()
  const filename = `${safe}_data_descriptor.docx`
  let notice = ''
  if (import.meta.env?.VITE_DD_RENDERER !== 'js') {
    try {
      const { markdown, images } = buildDescriptorMarkdown({ dd: { ...dd, title }, fullData, figures })
      const res = await fetch('/api/dd/render', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown, images }),
      })
      const body = await res.json().catch(() => ({}))
      if (res.ok && body.ok && body.docxBase64) return { blob: base64ToBlob(body.docxBase64), filename, renderer: 'template', notice: '' }
      notice = body.problems?.length
        ? `The template renderer reported: ${body.problems.slice(0, 3).join('; ')}.`
        : (body.error || `The template renderer answered ${res.status}.`)
      console.warn('[data descriptor] template renderer not used:', notice)
    } catch (e) {
      notice = 'The template renderer could not be reached.'
      console.warn('[data descriptor] template renderer failed:', e)
    }
  }
  const { blob, filename: fn } = await generateDataDescriptorDocx({ ...dd, title, figures, fullData, returnBlob: true })
  return { blob, filename: fn || filename, renderer: 'builtin', notice }
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
}
