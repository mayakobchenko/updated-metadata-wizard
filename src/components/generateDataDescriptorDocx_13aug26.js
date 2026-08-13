import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Header, Footer, PageNumber,
  WidthType, ShadingType, Table, TableRow, TableCell,
} from 'docx'

// `dd` here is the DataDescriptor step's own data (dd.authors and
// dd.affiliations_list are already resolved to display names / numbered
// institutions by DataDescriptor.jsx — this file must NOT recompute author
// names from fullData.contribution.authors itself, since those only hold
// raw KG URLs, not resolved names).
export async function generateDataDescriptorDocx({ fullData = {}, ...dd }) {
  const d1   = fullData.dataset1      || {}
  const cust = fullData.custodian     || {}
  const cont = fullData.contactperson || {}

  // ── helpers ────────────────────────────────────────────────────────────────
  const h1 = (text) => new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160 },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 26, font: 'Arial' })]
  })

  const h2 = (text) => new Paragraph({
    spacing: { before: 280, after: 100 },
    children: [new TextRun({ text, bold: true, size: 22, font: 'Arial', color: '1a6b35' })]
  })

  const questionLabel = (text) => new Paragraph({
    spacing: { before: 180, after: 60 },
    children: [new TextRun({ text, bold: true, italics: true, size: 20, font: 'Arial', color: '444444' })]
  })

  const bodyLines = (text) => {
    if (!text) return []
    return text.split('\n').map((line, i, arr) =>
      new Paragraph({
        spacing: { after: i === arr.length - 1 ? 160 : 40 },
        children: [new TextRun({ text: line, size: 22, font: 'Arial' })]
      })
    )
  }

  const spacer = (after = 120) => new Paragraph({ text: '', spacing: { after } })

  const divider = () => new Paragraph({
    spacing: { before: 200, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '00C959', space: 1 } },
    children: []
  })

  // ── green title banner ────────────────────────────────────────────────────
  const titleBanner = () => new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({
      children: [new TableCell({
        shading: { fill: '00C959', type: ShadingType.CLEAR },
        margins: { top: 240, bottom: 240, left: 360, right: 360 },
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
              text: 'DATA DESCRIPTOR', bold: true, size: 44, font: 'Arial', color: 'FFFFFF'
            })],
            spacing: { after: 60 }
          }),
          new Paragraph({
            children: [new TextRun({
              text: `EBRAINS  ·  ${new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`,
              size: 18, font: 'Arial', color: 'CCFFDD'
            })]
          }),
        ]
      })]
    })]
  })

  // ── authors / affiliations ───────────────────────────────────────────────
  // Use the already-resolved lists built by DataDescriptor.jsx. Each author
  // may reference one or more affiliation numbers (e.g. "1,2"), rendered as
  // a superscript after their name — standard author-list convention.
  const authorsList      = Array.isArray(dd.authors) ? dd.authors : []
  const affiliationsList = Array.isArray(dd.affiliations_list) ? dd.affiliations_list : []
  const custodianName    = `${cust.firstName || ''} ${cust.familyName || ''}`.trim()

  const authorsParagraph = () => {
    if (!authorsList.length) {
      return custodianName ? bodyLines(custodianName) : []
    }
    const runs = []
    authorsList.forEach((a, i) => {
      if (i > 0) runs.push(new TextRun({ text: ', ', size: 22, font: 'Arial' }))
      runs.push(new TextRun({ text: a.name || '', size: 22, font: 'Arial' }))
      if (a.affiliationNumbers) {
        runs.push(new TextRun({
          text: a.affiliationNumbers, size: 16, font: 'Arial', superScript: true
        }))
      }
    })
    return [new Paragraph({ spacing: { after: 160 }, children: runs })]
  }

  const affiliationsParagraphs = () => {
    if (affiliationsList.length) {
      return affiliationsList.map((aff) => new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun({ text: `${aff.number}. ${aff.text || ''}`, size: 22, font: 'Arial' })]
      }))
    }
    return cust.institution ? bodyLines(cust.institution) : []
  }

  // ── section: question + answer helper ────────────────────────────────────
  const QA = (question, answer) => {
    if (!answer) return []
    return [
      questionLabel(question),
      ...bodyLines(answer),
    ]
  }

  // ── build children ────────────────────────────────────────────────────────
  const children = []
  const push = (...items) => items.flat().filter(Boolean).forEach(i => children.push(i))

  push(titleBanner())
  push(spacer(240))

  // TITLE
  push(h1('Title'))
  push(...bodyLines(dd.title || d1.dataTitle || 'Untitled Dataset'))
  push(divider())

  // AUTHORS
  if (authorsList.length || custodianName) {
    push(h1('Authors'))
    push(...authorsParagraph())
    push(divider())
  }

  // AFFILIATIONS
  if (affiliationsList.length || cust.institution) {
    push(h1('Affiliations'))
    push(...affiliationsParagraphs())
    push(divider())
  }

  // CORRESPONDING AUTHOR
  if (dd.correspondingAuthor || cont.email) {
    push(h1('Corresponding Author(s)'))
    push(...bodyLines(dd.correspondingAuthor || `${custodianName}: ${cust.email || ''}`))
    push(divider())
  }

  // DATASET IDENTITY — matches "2. Dataset identity" in the form
  push(h1('Dataset Identity'))
  push(...QA('What type of data do you share?', dd.dataType))
  push(...QA('Field of study', dd.fieldOfStudy))
  push(...QA('Type of study', dd.studyType))
  push(...QA('What are the data?', dd.whatAreTheData))
  push(divider())

  // SCIENTIFIC CONTEXT — matches "3. Scientific context" in the form
  push(h1('Scientific Context'))
  push(...QA('What is the scientific background and context?', dd.scientificContext))
  push(...QA('What was the motivation for creating and sharing this dataset?', dd.motivation))
  push(...QA('What was the central hypothesis or research question?', dd.hypothesis))
  push(divider())

  // MATERIALS AND METHODS — matches "4. Methods" in the form
  push(h1('Materials and Methods'))
  push(...QA('What methods were used to acquire the data?', dd.methods))
  push(...QA('What software and analysis tools were used?', dd.software))
  push(divider())

  // DATA RECORDS — matches "5. Data description" in the form
  push(h1('Data Records'))
  push(...QA('Describe the dataset structure and content', dd.dataDescription))
  push(...QA('What are the key results or findings?', dd.results))
  if (dd.dataRepository) {
    push(h2('Repository'))
    push(...bodyLines(dd.dataRepository))
  }
  push(divider())

  // USAGE NOTES — matches "6. Usage and reuse" in the form
  push(h1('Usage Notes'))
  push(...QA('What can this dataset be used for?', dd.usageNotes))
  push(...QA('Are there any limitations or important caveats?', dd.limitations))
  push(divider())

  // ACKNOWLEDGEMENTS
  if (dd.funding) {
    push(h1('Acknowledgements'))
    push(...bodyLines(dd.funding))
    push(divider())
  }

  // REFERENCES
  if (dd.references) {
    push(h1('References'))
    push(...bodyLines(dd.references))
  }

  // ── assemble ──────────────────────────────────────────────────────────────
  const doc = new Document({
    creator:     'EBRAINS Metadata Wizard',
    title:       dd.title || d1.dataTitle || 'Data Descriptor',
    description: 'Generated by the EBRAINS Metadata Wizard',
    styles: {
      default: { document: { run: { font: 'Arial', size: 22 } } },
      paragraphStyles: [
        {
          id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run:       { size: 26, bold: true, font: 'Arial', color: '111111' },
          paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 0 }
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
              new TextRun({
                text: dd.title || d1.dataTitle || 'Data Descriptor',
                size: 16, font: 'Arial', color: '555555', italics: true
              }),
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
