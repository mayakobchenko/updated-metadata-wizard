import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Header, Footer, PageNumber,
  WidthType, ShadingType, Table, TableRow, TableCell,
} from 'docx'

export async function generateDataDescriptorDocx({ fullData = {}, ...dd }) {
  const d1   = fullData.dataset1     || {}
  const cust = fullData.custodian    || {}
  const cont = fullData.contactperson|| {}
  const fund = fullData.funding      || {}
  const contr= fullData.contribution || {}

  // ── helpers ────────────────────────────────────────────────────────────────

  const h1 = (text) => new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 160 },
    children: [new TextRun({ text, bold: true, size: 28, font: 'Arial' })]
  })

  const h2 = (text) => new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, size: 24, font: 'Arial', color: '1a6b35' })]
  })

  const body = (text, opts = {}) => {
    if (!text) return null
    const lines = text.split('\n')
    return lines.map((line, i) => new Paragraph({
      spacing: { after: i === lines.length - 1 ? 160 : 40 },
      children: [new TextRun({ text: line, size: 22, font: 'Arial', ...opts })]
    }))
  }

  const label = (text) => new Paragraph({
    spacing: { after: 40 },
    children: [new TextRun({ text, bold: true, size: 22, font: 'Arial', color: '1a6b35' })]
  })

  const spacer = () => new Paragraph({ text: '', spacing: { after: 120 } })

  const divider = () => new Paragraph({
    spacing: { before: 160, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '00C959', space: 1 } },
    children: []
  })

  // ── resolve author names (best effort from form data) ─────────────────────
  const authorNames = (contr.authors || []).map(a =>
    a.selectedAuthor
      ? a.selectedAuthor.split('/').pop()  // UUID fallback
      : `${a.firstName || ''} ${a.lastName || ''}`.trim()
  ).filter(Boolean)

  const custodianName = `${cust.firstName || ''} ${cust.familyName || ''}`.trim()
  const contactName   = `${cont.firstName || ''} ${cont.familyName || ''}`.trim()

  // ── funding string ────────────────────────────────────────────────────────
  const fundingLines = (fund.funders || []).map(f =>
    [f.funderName, f.awardTitle, f.grantId || f.awardNumber].filter(Boolean).join(' — ')
  )

  const ddFunding = dd.funding
    || (fundingLines.length ? fundingLines.join('\n') : '')

  // ── title block table (mimics the PDF header) ─────────────────────────────
  const titleTable = () => new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({
      children: [new TableCell({
        shading: { fill: '00C959', type: ShadingType.CLEAR },
        margins: { top: 200, bottom: 200, left: 300, right: 300 },
        width: { size: 9360, type: WidthType.DXA },
        borders: {
          top:    { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.NONE },
          left:   { style: BorderStyle.NONE },
          right:  { style: BorderStyle.NONE },
        },
        children: [
          new Paragraph({
            children: [new TextRun({
              text: 'DATA DESCRIPTOR',
              bold: true, size: 40, font: 'Arial', color: 'FFFFFF'
            })],
            spacing: { after: 80 }
          }),
          new Paragraph({
            children: [new TextRun({
              text: `EBRAINS — ${new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`,
              size: 18, font: 'Arial', color: 'CCFFDD'
            })]
          }),
        ]
      })]
    })]
  })

  // ── build document children ───────────────────────────────────────────────
  const children = []
  const push = (...items) => items.flat().filter(Boolean).forEach(i => children.push(i))

  push(titleTable())
  push(spacer())

  // Title
  push(h1(dd.title || d1.dataTitle || 'Untitled Dataset'))
  push(divider())

  // Authors / contributors
  if (authorNames.length || custodianName) {
    push(h2('AUTHORS'))
    if (authorNames.length) push(...(body(authorNames.join(', ')) || []))
    push(spacer())
  }

  if (custodianName || contactName || cust.email || cont.email) {
    push(h2('CORRESPONDING AUTHOR(S)'))
    if (custodianName) push(...(body(`${custodianName}${cust.email ? ': ' + cust.email : ''}`) || []))
    if (contactName && contactName !== custodianName)
      push(...(body(`${contactName}${cont.email ? ': ' + cont.email : ''}`) || []))
    push(spacer())
  }

  // Section 1 — What are the data
  push(h2('SUMMARY'))
  push(...(body(dd.whatAreTheData) || []))
  if (dd.scientificContext) push(...(body(dd.scientificContext) || []))
  if (dd.motivation) push(...(body(dd.motivation) || []))
  push(spacer())

  // Version / field of study meta
  if (dd.fieldOfStudy || dd.studyType) {
    push(h2('DATASET SPECIFICATIONS'))
    if (dd.fieldOfStudy) {
      push(label('Field of study'))
      push(...(body(dd.fieldOfStudy) || []))
    }
    if (dd.studyType) {
      push(label('Type of study'))
      push(...(body(dd.studyType) || []))
    }
    push(spacer())
  }

  // Section 2 — Scientific context / hypothesis
  push(h2('SCIENTIFIC BACKGROUND'))
  push(label('Research context'))
  push(...(body(dd.scientificContext || '(see Summary above)') || []))
  push(label('Central hypothesis / research question'))
  push(...(body(dd.hypothesis) || []))
  push(spacer())

  // Section 3 — Methods
  push(h2('MATERIALS AND METHODS'))
  push(label('Data acquisition'))
  push(...(body(dd.methods) || []))
  if (dd.software) {
    push(label('Software and analysis tools'))
    push(...(body(dd.software) || []))
  }
  push(spacer())

  // Section 4 — Data description
  push(h2('DATA RECORDS'))
  push(...(body(dd.dataDescription) || []))
  if (dd.results) {
    push(label('Key results'))
    push(...(body(dd.results) || []))
  }
  push(spacer())

  // Section 5 — Usage
  push(h2('USAGE NOTES'))
  push(...(body(dd.usageNotes) || []))
  if (dd.limitations) {
    push(label('Limitations and caveats'))
    push(...(body(dd.limitations) || []))
  }
  push(spacer())

  // Funding
  if (ddFunding) {
    push(h2('ACKNOWLEDGEMENTS'))
    push(...(body(ddFunding) || []))
    push(spacer())
  }

  // ── assemble document ─────────────────────────────────────────────────────
  const doc = new Document({
    creator:     'EBRAINS Metadata Wizard',
    title:       dd.title || d1.dataTitle || 'Data Descriptor',
    description: 'Generated by the EBRAINS Metadata Wizard',
    styles: {
      default: {
        document: { run: { font: 'Arial', size: 22 } }
      },
      paragraphStyles: [
        {
          id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run:       { size: 28, bold: true, font: 'Arial', color: '111111' },
          paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 0 }
        },
        {
          id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run:       { size: 24, bold: true, font: 'Arial', color: '1a6b35' },
          paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 }
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
        default: new Header({
          children: [new Paragraph({
            children: [
              new TextRun({ text: `${dd.title || d1.dataTitle || 'Data Descriptor'}`, size: 16, font: 'Arial', color: '555555', italics: true }),
              new TextRun({ text: '  |  version: 1', size: 16, font: 'Arial', color: '555555' }),
            ]
          })]
        })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: 'Page ', size: 16, font: 'Arial', color: '888888' }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, font: 'Arial', color: '888888' }),
              new TextRun({ text: ' of ', size: 16, font: 'Arial', color: '888888' }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, font: 'Arial', color: '888888' }),
            ]
          })]
        })
      },
      children,
    }]
  })

  const blob = await Packer.toBlob(doc)
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  const safe = (dd.title || d1.dataTitle || 'data_descriptor')
    .replace(/[^a-z0-9]/gi, '_').slice(0, 40).toLowerCase()
  a.href     = url
  a.download = `${safe}_data_descriptor.docx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}