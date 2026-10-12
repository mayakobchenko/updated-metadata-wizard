import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, Header, Footer, PageNumber,
  WidthType, Table, TableRow, TableCell, BorderStyle, ImageRun,
} from 'docx'

// Path to the EBRAINS logo mark used in the document header. Served as a
// static asset from /public, fetched at generation time and embedded as an
// ImageRun (docx needs raw image bytes, not a URL).
const LOGO_URL = '/logo.png'
const LOGO_WIDTH  = 150
const LOGO_HEIGHT = 64 // matches the 127x54 source aspect ratio

async function fetchLogoBytes() {
  try {
    const res = await fetch(LOGO_URL)
    if (!res.ok) return null
    return new Uint8Array(await res.arrayBuffer())
  } catch {
    return null
  }
}

// `dd` here is the DataDescriptor step's own data (dd.authors and
// dd.affiliations_list are already resolved to display names / numbered
// institutions by DataDescriptor.jsx — this file must NOT recompute author
// names from fullData.contribution.authors itself, since those only hold
// raw KG URLs, not resolved names).
export async function generateDataDescriptorDocx({ fullData = {}, figures = [], ...dd }) {
  const d1   = fullData.dataset1      || {}
  const cust = fullData.custodian     || {}
  const cont = fullData.contactperson || {}

  const title   = dd.title || d1.dataTitle || 'Untitled Dataset'
  const version = dd.version || '1'

  // ── text style helpers ───────────────────────────────────────────────────
  // Sizes below are taken directly from the template's styles.xml (w:sz is
  // in half-points): Normal = 22 (11pt), Heading 2 / Heading 3 = 22 (11pt,
  // bold inherited from Heading 1). The one deliberate deviation from the
  // template is DATA DESCRIPTOR, set to 20pt per explicit request (the
  // template's own Heading 1 is 14pt).
  const mainHeading = (text) => new Paragraph({
    spacing: { before: 0, after: 200 },
    children: [new TextRun({
      text: text.toUpperCase(),
      bold: true, size: 40, font: 'Calibri', color: '000000', // 20pt
    })]
  })

  // Section labels (TITLE, AUTHORS, AFFILIATIONS, SUMMARY, etc.) — bold,
  // 11pt, matching the template's Heading 2 / Heading 3 styles exactly.
  const sectionHeading = (text, { allCaps = true } = {}) => new Paragraph({
    spacing: { before: 320, after: 120 },
    children: [new TextRun({
      text: allCaps ? text.toUpperCase() : text,
      bold: true, size: 22, font: 'Calibri', color: '000000', // 11pt
    })]
  })

  const subLabel = (text) => new Paragraph({
    spacing: { before: 120, after: 40 },
    children: [new TextRun({ text, bold: true, size: 22, font: 'Calibri' })]
  })

  // Body text, and the dataset title itself — plain Calibri 11pt, matching
  // the template's Normal / "1) Body Text HBP" style (not bold, not enlarged).
  const bodyLines = (text) => {
    if (!text) return []
    // lines of a file-tree / table (box-drawing characters, leading spaces or
    // column padding) keep their layout in a monospaced font
    const isLayout = (l) => /^[\s│├└─]*[│├└]/.test(l) || /^\S.*\/ \(\d+ files?,/.test(l) || / {3,}\S/.test(l) || /^-{3,}( +-{3,})*$/.test(l)
    return text.split('\n').filter((l) => l.trim() !== '').map((line) =>
      isLayout(line)
        ? new Paragraph({
            spacing: { after: 0 },
            children: [new TextRun({ text: line, size: 18, font: 'Courier New' })]
          })
        : new Paragraph({
            spacing: { after: 160 },
            children: [new TextRun({ text: line, size: 22, font: 'Calibri' })]
          })
    )
  }

  const spacer = (after = 100) => new Paragraph({ text: '', spacing: { after } })

  // ── authors / affiliations ───────────────────────────────────────────────
  // Use the already-resolved lists built by DataDescriptor.jsx. Each author
  // may reference one or more affiliation numbers (e.g. "1,2"), rendered as
  // a superscript after their name — matches the template's author-list style.
  const authorsList      = Array.isArray(dd.authors) ? dd.authors : []
  const affiliationsList = Array.isArray(dd.affiliations_list) ? dd.affiliations_list : []
  const custodianName    = `${cust.firstName || ''} ${cust.familyName || ''}`.trim()

  const authorsParagraph = () => {
    if (!authorsList.length) {
      return custodianName ? bodyLines(custodianName) : []
    }
    const runs = []
    authorsList.forEach((a, i) => {
      if (i > 0) runs.push(new TextRun({ text: ', ', size: 22, font: 'Calibri' }))
      runs.push(new TextRun({ text: a.name || '', size: 22, font: 'Calibri' }))
      if (a.affiliationNumbers) {
        runs.push(new TextRun({
          text: a.affiliationNumbers, size: 16, font: 'Calibri', superScript: true
        }))
      }
    })
    return [new Paragraph({ spacing: { after: 160 }, children: runs })]
  }

  const affiliationsParagraphs = () => {
    if (affiliationsList.length) {
      return affiliationsList.map((aff) => new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun({ text: `${aff.number}. ${aff.text || ''}`, size: 22, font: 'Calibri' })]
      }))
    }
    return cust.institution ? bodyLines(cust.institution) : []
  }

  const correspondingAuthorsParagraphs = () => {
    const value = dd.correspondingAuthor || `${custodianName}: ${cust.email || ''}`
    // one line per corresponding author, matching the template's list style
    return value.split(/\n|;/).map((s) => s.trim()).filter(Boolean).map((line) =>
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun({ text: line, size: 22, font: 'Calibri' })]
      })
    )
  }

  // ── figures and tables uploaded in the wizard ───────────────────────────
  // Tables get their caption ABOVE, figures BELOW (usual journal convention).
  const CONTENT_WIDTH_PX = 560      // A4 minus margins, at 96 dpi, with a little room
  const MAX_FIGURE_HEIGHT_PX = 640
  const CONTENT_WIDTH_DXA = 9638
  const base64ToBytes = (dataUrl) => {
    const bin = atob(String(dataUrl).split(',')[1] || '')
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
  }
  const captionPara = (label, caption) => new Paragraph({
    spacing: { before: 60, after: 200 },
    children: [
      new TextRun({ text: `${label}. `, bold: true, size: 20, font: 'Calibri' }),
      new TextRun({ text: caption || '', size: 20, font: 'Calibri' }),
    ],
  })
  const thin = { style: BorderStyle.SINGLE, size: 4, color: '999999' }
  const cellBorders = { top: thin, bottom: thin, left: thin, right: thin }
  const tableBlocks = (rows, label, caption) => {
    const cols = Math.max(...rows.map(r => r.length), 1)
    const w = Math.floor(CONTENT_WIDTH_DXA / cols)
    const table = new Table({
      width: { size: w * cols, type: WidthType.DXA },
      columnWidths: Array(cols).fill(w),
      rows: rows.map((r, ri) => new TableRow({
        tableHeader: ri === 0,
        children: Array.from({ length: cols }, (_, ci) => new TableCell({
          width: { size: w, type: WidthType.DXA },
          borders: cellBorders,
          children: [new Paragraph({ children: [new TextRun({ text: String(r[ci] ?? ''), bold: ri === 0, size: 18, font: 'Calibri' })] })],
        })),
      })),
    })
    return [
      new Paragraph({ spacing: { before: 160, after: 60 }, keepNext: true, children: [
        new TextRun({ text: `${label}. `, bold: true, size: 20, font: 'Calibri' }),
        new TextRun({ text: caption || '', size: 20, font: 'Calibri' })] }),
      table,
      spacer(160),
    ]
  }
  const figureBlocks = (img, label, caption) => {
    let width = Math.min(CONTENT_WIDTH_PX, img.width || CONTENT_WIDTH_PX)
    let height = Math.round(width * (img.height || 1) / (img.width || 1))
    if (height > MAX_FIGURE_HEIGHT_PX) { height = MAX_FIGURE_HEIGHT_PX; width = Math.round(height * (img.width || 1) / (img.height || 1)) }
    return [
      new Paragraph({ spacing: { before: 160, after: 40 }, keepNext: true, children: [
        new ImageRun({ type: img.type === 'png' ? 'png' : 'jpg', data: base64ToBytes(img.dataUrl), transformation: { width, height } })] }),
      captionPara(label, caption),
    ]
  }
  // everything the researcher attached for one placement, numbered per kind in list order
  const attachmentsFor = (placement) => {
    const out = []
    figures.filter(f => f.placement === placement).forEach((f) => {
      const same = figures.filter(x => x.kind === f.kind)
      const label = `${f.kind === 'table' ? 'Table' : 'Figure'} ${same.indexOf(f) + 1}`
      out.push(...(f.kind === 'table' && f.rows ? tableBlocks(f.rows, label, f.caption)
        : f.image ? figureBlocks(f.image, label, f.caption) : []))
    })
    return out
  }

  // ── build children ────────────────────────────────────────────────────────
  const children = []
  const push = (...items) => items.flat().filter(Boolean).forEach((i) => children.push(i))

  push(mainHeading('Data Descriptor'))
  push(spacer(160))

  push(sectionHeading('Title'))
  push(...bodyLines(title))

  if (authorsList.length || custodianName) {
    push(sectionHeading('Authors'))
    push(...authorsParagraph())
  }

  if (affiliationsList.length || cust.institution) {
    push(sectionHeading('Affiliations'))
    push(...affiliationsParagraphs())
  }

  if (dd.correspondingAuthor || cont.email) {
    push(sectionHeading('Corresponding author(s):'))
    push(...correspondingAuthorsParagraphs())
  }

  // SUMMARY — prefers the dedicated `summary` field (written by hand, or
  // drafted via the "Generate with AI" button in the wizard). Falls back to
  // a raw concatenation of the underlying answers for older saved data that
  // predates the dedicated field.
  const summaryFallback = [dd.whatAreTheData, dd.scientificContext, dd.motivation, dd.hypothesis]
    .filter(Boolean).join(' ')
  const summaryText = dd.summary || summaryFallback
  if (summaryText) {
    push(sectionHeading('Summary'))
    push(...bodyLines(summaryText))
  }
  push(...attachmentsFor('summary'))

  push(sectionHeading('Version specifications:'))
  push(...bodyLines(`This is version ${version} of this dataset.`))

  // MATERIALS AND METHODS
  const hasMethods = dd.methods || dd.software
  if (hasMethods) {
    push(sectionHeading('Materials and Methods'))
    if (dd.methods) push(...bodyLines(dd.methods))
    if (dd.software) {
      push(subLabel('Software and analysis tools'))
      push(...bodyLines(dd.software))
    }
  }
  push(...attachmentsFor('methods'))

  // USAGE NOTES
  if (dd.usageNotes || dd.limitations) {
    push(sectionHeading('Usage Notes'))
    if (dd.usageNotes) push(...bodyLines(dd.usageNotes))
    if (dd.limitations) {
      push(subLabel('Limitations and caveats'))
      push(...bodyLines(dd.limitations))
    }
  }
  push(...attachmentsFor('usage'))

  // DATA RECORDS
  const hasDataRecords = dd.dataDescription || dd.results || dd.dataRepository
  if (hasDataRecords) {
    push(sectionHeading('Data Records'))
    if (dd.dataDescription) push(...bodyLines(dd.dataDescription))
    if (dd.results) {
      push(subLabel('Key results'))
      push(...bodyLines(dd.results))
    }
    if (dd.dataRepository) {
      push(subLabel('Repository'))
      push(...bodyLines(dd.dataRepository))
    }
  }
  push(...attachmentsFor('records'))

  // ACKNOWLEDGEMENTS — kept in title case, matching the template (the one
  // section header that is NOT rendered in all caps).
  if (dd.funding) {
    push(sectionHeading('Acknowledgements', { allCaps: false }))
    push(...bodyLines(dd.funding))
  }

  // REFERENCES
  if (dd.references) {
    push(sectionHeading('References'))
    push(...bodyLines(dd.references))
  }

  // ── header: "Title: '<title>' | version: 1" on the left, EBRAINS logo
  // on the right — a borderless single-row table, matching the template. ──
  const logoBytes = await fetchLogoBytes()
  const headerRightCell = logoBytes
    ? new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new ImageRun({
          type: 'png',
          data: logoBytes,
          transformation: { width: LOGO_WIDTH, height: LOGO_HEIGHT },
        })],
      })
    : new Paragraph({ children: [new TextRun({ text: 'EBRAINS', bold: true, size: 28, font: 'Calibri' })], alignment: AlignmentType.RIGHT })

  const headerTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [6560, 2800],
    borders: {
      top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
    },
    rows: [new TableRow({
      children: [
        new TableCell({
          width: { size: 6560, type: WidthType.DXA },
          borders: {
            top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
          },
          children: [new Paragraph({
            children: [
              new TextRun({ text: `Title: '${title}'`, italics: true, size: 22, font: 'Calibri', color: '444444' }),
              new TextRun({ text: `  |  version: ${version}`, size: 22, font: 'Calibri', color: '444444' }),
            ]
          })],
        }),
        new TableCell({
          width: { size: 2800, type: WidthType.DXA },
          borders: {
            top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
          },
          children: [headerRightCell],
        }),
      ],
    })],
  })

  // ── assemble ──────────────────────────────────────────────────────────────
  const doc = new Document({
    creator:     'EBRAINS Metadata Wizard',
    title,
    description: 'Generated by the EBRAINS Metadata Wizard',
    styles: {
      default: { document: { run: { font: 'Calibri', size: 22 } } },
      paragraphStyles: [
        {
          id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run:       { size: 40, bold: true, font: 'Calibri', color: '000000' }, // 20pt
          paragraph: { spacing: { before: 320, after: 120 }, outlineLevel: 0 }
        },
      ]
    },
    sections: [{
      properties: {
        page: {
          size:   { width: 11906, height: 16838 },
          margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 }
        }
      },
      headers: {
        default: new Header({ children: [headerTable] })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, font: 'Calibri', color: '444444' })]
          })]
        })
      },
      children,
    }]
  })

  const blob = await Packer.toBlob(doc)
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  const safe = title.replace(/[^a-z0-9]/gi, '_').slice(0, 40).toLowerCase()
  a.href     = url
  a.download = `${safe}_data_descriptor.docx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
