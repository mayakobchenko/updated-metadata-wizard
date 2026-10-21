// Writes the data descriptor in the Markdown format of the data descriptor skill (templates/markdown_template.md),
// so the server can render it into the official Word template with the skill's own script.
// Pure function: returns { markdown, images: [{ name, base64 }] }.

const esc = (t) => String(t ?? '').replace(/\r\n?/g, '\n')
const oneLine = (t) => esc(t).replace(/\s*\n\s*/g, ' ').trim()
const cell = (t) => esc(t).trim().replace(/\|/g, '\\|').replace(/\n/g, '<br>')
// every line but the last ends with a backslash (hard line break)
const hardBreaks = (lines) => lines.map((l, i) => (i < lines.length - 1 ? `${l}\\` : l)).join('\n')

const PLACEMENT_SECTION = { summary: 'summary', methods: 'methods', usage: 'usage', records: 'records' }

export function buildDescriptorMarkdown({ dd = {}, fullData = {}, figures = [] }) {
  const d1 = fullData.dataset1 || {}
  const title = oneLine(dd.title || d1.dataTitle || 'Untitled dataset')
  const version = dd.version || '1'
  const shortTitle = oneLine((d1.shortTitle || '').trim() || title)
  const authors = Array.isArray(dd.authors) ? dd.authors.filter(a => a.name) : []
  const affs = Array.isArray(dd.affiliations_list) ? dd.affiliations_list : []
  const images = []

  // figures/tables placed after a section
  const figureBlocks = {}
  const counters = { figure: 0, table: 0 }
  figures.forEach((f) => {
    const sec = PLACEMENT_SECTION[f.placement] || 'summary'
    const n = ++counters[f.kind === 'table' ? 'table' : 'figure']
    const cap = oneLine(f.caption)
    let block
    if (f.kind === 'table') {
      const rows = f.rows || []
      const width = Math.max(...rows.map(r => r.length), 1)
      const pad = (r) => Array.from({ length: width }, (_, i) => cell(r[i] ?? ''))
      const lines = rows.map((r, i) => `| ${pad(r).join(' | ')} |${i === 0 ? `\n|${' --- |'.repeat(width)}` : ''}`)
      block = `**Table ${n}:** ${cap}\n\n${lines.join('\n')}`
    } else if (f.image) {
      const ext = f.image.type === 'png' ? 'png' : 'jpg'
      const name = `figure${n}.${ext}`
      images.push({ name, base64: String(f.image.dataUrl).split(',')[1] || '' })
      block = `![**Figure ${n}:** ${cap}](${name})`
    }
    if (block) (figureBlocks[sec] ||= []).push(block)
  })
  const after = (sec) => (figureBlocks[sec] || []).map(b => `\n${b}\n`).join('')

  // authors with affiliation numbers, equal-contribution dagger and corresponding asterisk
  const equal = authors.filter(a => a.equal)
  const authorLine = authors.map((a) => {
    const marks = [a.affiliationNumbers, a.equal && equal.length > 1 ? '†' : ''].filter(Boolean).join(',') + (a.corresponding ? (a.affiliationNumbers || (a.equal && equal.length > 1) ? ',' : '') + '*' : '')
    return `${oneLine(a.name)}${marks ? `^${marks}^` : ''}`
  }).join(', ')
  const affLines = affs.map((a, i) => `${a.number || i + 1}. ${oneLine(a.text)}`)
  const foot = []
  if (equal.length > 1) {
    const names = equal.map(a => a.name)
    foot.push(`^†^ These authors contributed equally: ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`)
  }
  if (authors.some(a => a.corresponding)) foot.push(`^*^ Corresponding author${authors.filter(a => a.corresponding).length > 1 ? 's' : ''}`)

  const corr = String(dd.correspondingAuthor || '').split(/\n|;/).map(s => s.trim()).filter(Boolean)

  const out = []
  out.push(`*Title: '${shortTitle}' | version: ${version}*`, '', '# DATA DESCRIPTOR', '', '## TITLE', '', title, '')
  out.push('## AUTHORS', '', authorLine || '(authors)', '', '### AFFILIATIONS', '', affLines.join('\n') || '1. (affiliation)', '')
  if (foot.length) out.push(hardBreaks(foot), '')
  out.push('### CORRESPONDING AUTHOR(S)', '', corr.length ? hardBreaks(corr) : '(corresponding author)', '')
  out.push('## SUMMARY', '', esc(dd.summary).trim(), after('summary'))
  out.push('## VERSION SPECIFICATIONS', '', (dd.versionSpec || '').trim() || `This is version ${version} of this dataset.`, '')
  out.push('## MATERIALS AND METHODS', '', esc(dd.methods).trim(), after('methods'))
  const usage = [esc(dd.usageNotes).trim()]
  if ((dd.software || '').trim()) usage.push(`### Software and code\n\n${hardBreaks(esc(dd.software).trim().split('\n'))}`)
  if ((dd.limitations || '').trim()) usage.push(`### Limitations and caveats\n\n${esc(dd.limitations).trim()}`)
  out.push('## USAGE NOTES', '', usage.filter(Boolean).join('\n\n'), after('usage'))

  // DATA RECORDS: optional intro, the tree, the format table
  const rec = []
  if ((dd.dataDescription || '').trim()) rec.push(esc(dd.dataDescription).trim())
  if ((dd.dataRecordsTree || '').trim()) {
    rec.push('The data are stored in the following structure (incl. info on file content):')
    rec.push('```\n' + esc(dd.dataRecordsTree).replace(/\s+$/, '') + '\n```')
  }
  const rows = (dd.dataRecordsFormats || []).filter(r => r.format || r.extension || r.software)
  if (rows.length) {
    rec.push(['| Format | Extension | Software used / file specification |', '|--------|-----------|------------------------------------|',
      ...rows.map(r => `| ${cell(r.format)} | ${cell(r.extension)} | ${cell(r.software)} |`)].join('\n'))
  }
  out.push('## DATA RECORDS', '', rec.join('\n\n'), after('records'))

  if ((dd.funding || '').trim()) out.push('## Acknowledgements', '', esc(dd.funding).trim(), '')
  const contrib = esc(dd.authorContributions).split('\n').map(l => l.trim()).filter(Boolean)
  if (contrib.length) out.push('## Author contributions', '', hardBreaks(contrib), '')
  const refLines = esc(dd.references).split('\n').map(l => l.trim()).filter(Boolean)
  if (refLines.length) {
    const numbered = refLines.some(l => /^\d+[.)]\s/.test(l))
    out.push('## REFERENCES', '', (numbered ? refLines : refLines.map((l, i) => `${i + 1}. ${l}`)).join('\n'), '')
  }
  return { markdown: out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n', images }
}
