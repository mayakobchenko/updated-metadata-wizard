import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, Header, Footer, PageNumber,
  WidthType, Table, TableRow, TableCell, BorderStyle, ImageRun,
} from 'docx'

// Path to the EBRAINS logo mark used in the document header. Served as a
// static asset from /public, fetched at generation time and embedded as an
// ImageRun (docx needs raw image bytes, not a URL).
const LOGO_URL = '/logo.png'
const LOGO_WIDTH  = 80
const LOGO_HEIGHT = 34 // matches the 127x54 source aspect ratio

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
export async function generateDataDescriptorDocx({ fullData = {}, ...dd }) {
  const d1   = fullData.dataset1      || {}
  const cust = fullData.custodian     || {}
  const cont = fullData.contactperson || {}

  const title   = dd.title || d1.dataTitle || 'Untitled Dataset'
  const version = dd.version || '1'

  // ── text style helpers, matching the official EBRAINS Data Descriptor
  // template: Calibri throughout (the template's actual docDefaults font),
  // bold ALL CAPS section headers (Acknowledgements is the one exception —
  // the template keeps that one in title case), plain body text.
  const mainHeading = (text) => new Paragraph({
    spacing: { before: 0, after: 200 },
    children: [new TextRun({
      text: text.toUpperCase(),
      bold: true, size: 32, font: 'Calibri', color: '000000', // 16pt
    })]
  })

  const sectionHeading = (text, { allCaps = true } = {}) => new Paragraph({
    spacing: { before: 320, after: 120 },
    children: [new TextRun({
      text: allCaps ? text.toUpperCase() : text,
      bold: true, size: 24, font: 'Calibri', color: '000000', // 12pt
    })]
  })

  // The dataset title itself — Bold, Calibri, 20pt, distinct from (and
  // larger than) every other heading in the document.
  const titleText = (text) => new Paragraph({
    spacing: { after: 160 },
    children: [new TextRun({
      text, bold: true, size: 40, font: 'Calibri', color: '000000', // 20pt
    })]
  })

  const subLabel = (text) => new Paragraph({
    spacing: { before: 120, after: 40 },
    children: [new TextRun({ text, bold: true, size: 22, font: 'Calibri' })]
  })

  const bodyLines = (text) => {
    if (!text) return []
    return text.split('\n').filter((l) => l.trim() !== '').map((line) =>
      new Paragraph({
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

  // ── build children ────────────────────────────────────────────────────────
  const children = []
  const push = (...items) => items.flat().filter(Boolean).forEach((i) => children.push(i))

  push(mainHeading('Data Descriptor'))
  push(spacer(160))

  push(sectionHeading('Title'))
  push(titleText(title))

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

  // SUMMARY — a single flowing narrative, combining the dataset-identity and
  // scientific-context answers, matching the template's SUMMARY paragraph
  // rather than presenting each wizard question separately.
  const summaryParts = [dd.whatAreTheData, dd.scientificContext, dd.motivation, dd.hypothesis]
    .filter(Boolean)
  if (summaryParts.length) {
    push(sectionHeading('Summary'))
    push(...bodyLines(summaryParts.join(' ')))
  }

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

  // USAGE NOTES
  if (dd.usageNotes || dd.limitations) {
    push(sectionHeading('Usage Notes'))
    if (dd.usageNotes) push(...bodyLines(dd.usageNotes))
    if (dd.limitations) {
      push(subLabel('Limitations and caveats'))
      push(...bodyLines(dd.limitations))
    }
  }

  // DATA RECORDS
  const hasDataRecords = dd.dataType || dd.fieldOfStudy || dd.studyType ||
    dd.dataDescription || dd.results || dd.dataRepository
  if (hasDataRecords) {
    push(sectionHeading('Data Records'))
    if (dd.dataType) {
      push(subLabel('Data type'))
      push(...bodyLines(dd.dataType))
    }
    if (dd.fieldOfStudy) {
      push(subLabel('Field of study'))
      push(...bodyLines(dd.fieldOfStudy))
    }
    if (dd.studyType) {
      push(subLabel('Type of study'))
      push(...bodyLines(dd.studyType))
    }
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
          data: logoBytes,
          transformation: { width: LOGO_WIDTH, height: LOGO_HEIGHT },
        })],
      })
    : new Paragraph({ children: [new TextRun({ text: 'EBRAINS', bold: true, size: 20, font: 'Calibri' })], alignment: AlignmentType.RIGHT })

  const headerTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [7000, 2360],
    borders: {
      top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
    },
    rows: [new TableRow({
      children: [
        new TableCell({
          width: { size: 7000, type: WidthType.DXA },
          borders: {
            top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
          },
          children: [new Paragraph({
            children: [
              new TextRun({ text: `Title: '${title}'`, italics: true, size: 18, font: 'Calibri', color: '444444' }),
              new TextRun({ text: `  |  version: ${version}`, size: 18, font: 'Calibri', color: '444444' }),
            ]
          })],
        }),
        new TableCell({
          width: { size: 2360, type: WidthType.DXA },
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
          run:       { size: 24, bold: true, font: 'Calibri', color: '000000' },
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
