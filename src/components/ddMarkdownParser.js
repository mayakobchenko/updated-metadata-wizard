// Reads a data descriptor written in the skill's Markdown format (template.md) and maps its sections
// to the wizard's Data Descriptor fields. Pure functions, no UI.
const WORDS = (t) => (String(t || '').trim().match(/\S+/g) || []).length

// section heading (upper-cased) -> wizard field
const SECTION_FIELDS = {
  'SUMMARY': 'summary',
  'VERSION SPECIFICATIONS': 'versionSpec',
  'MATERIALS AND METHODS': 'methods',
  'USAGE NOTES': 'usageNotes',
  'DATA RECORDS': 'dataDescription',
  'REFERENCES': 'references',
  'ACKNOWLEDGEMENTS': 'funding',
  'ACKNOWLEDGMENTS': 'funding',
}

export const FIELD_LABELS = {
  summary: 'Summary', versionSpec: 'Version specifications', methods: 'Materials and methods',
  usageNotes: 'Usage notes', dataDescription: 'Dataset structure and content (Data records)',
  dataRecordsTree: 'File structure (directory tree)', dataRecordsFormats: 'File formats table',
  references: 'References', funding: 'Funding and acknowledgements',
}

const stripComments = (t) => t.replace(/<!--[\s\S]*?-->/g, '')
const clean = (t) => t.replace(/\\\s*$/gm, '').replace(/\n{3,}/g, '\n\n').trim()

// pipe table -> [{format, extension, software}] (the header and the separator row are skipped)
function parseFormatsTable(block) {
  const rows = []
  block.split('\n').forEach((line) => {
    if (!/^\s*\|/.test(line)) return
    const cells = line.trim().replace(/^\||\|$/g, '').split('|').map(c => c.replace(/<br\s*\/?>/gi, ' ').trim())
    if (cells.length < 3 || /^-+$/.test(cells[0].replace(/[:\s]/g, '')) || /^format$/i.test(cells[0])) return
    rows.push({ format: cells[0], extension: cells[1], software: cells.slice(2).join(' | ') })
  })
  return rows
}

// returns { fields: {field: text}, formats: [...] | null, warnings: [string] }
export function parseDescriptorMarkdown(text) {
  const warnings = []
  const src = stripComments(String(text || '').replace(/\r\n?/g, '\n'))
  // split into level-2 sections (and keep their ### subsections inside)
  const parts = src.split(/^##\s+(?!#)/m).slice(1)
  const fields = {}
  let formats = null
  const found = new Set()
  parts.forEach((part) => {
    const nl = part.indexOf('\n')
    const heading = (nl < 0 ? part : part.slice(0, nl)).trim().replace(/\s+/g, ' ').toUpperCase()
    const body = nl < 0 ? '' : part.slice(nl + 1)
    const field = SECTION_FIELDS[heading]
    if (!field) return
    found.add(field)
    if (field === 'dataDescription') {
      const fence = body.match(/```[^\n]*\n([\s\S]*?)```/)
      if (fence) fields.dataRecordsTree = fence[1].replace(/\s+$/, '')
      const tableLines = body.split('\n').filter(l => /^\s*\|/.test(l)).join('\n')
      if (tableLines) { const f = parseFormatsTable(tableLines); if (f.length) formats = f }
      const prose = body.replace(/```[\s\S]*?```/g, '').split('\n').filter(l => !/^\s*\|/.test(l)).join('\n')
      // the Word file writes this sentence itself above the tree
      fields.dataDescription = clean(prose.split('\n').filter(l => !/^\s*the data are stored in the following structure[^\n]*$/i.test(l)).join('\n'))
    } else {
      fields[field] = clean(body)
    }
  })
  if (!parts.length || !found.size) warnings.push('No sections were recognised. Is this the Markdown from the data descriptor skill (headings such as ## SUMMARY)?')
  // checks
  if (fields.summary && WORDS(fields.summary) > 220) warnings.push(`The imported summary has ${WORDS(fields.summary)} words; the maximum is 220.`)
  Object.entries(fields).forEach(([f, v]) => {
    if (f === 'dataRecordsTree') return
    const t = v.replace(/`[^`\n]*`/g, '')   // placeholders inside code spans are filename patterns, not unfinished text
    if (/<(?!br\b|sup\b|sub\b)[A-Za-z][A-Za-z ._-]*>/.test(t)) warnings.push(`“${FIELD_LABELS[f] || f}” still contains <angle-bracket placeholders>.`)
  })
  return { fields, formats, warnings }
}
