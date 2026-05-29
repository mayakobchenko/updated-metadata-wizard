import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Header, Footer, PageNumber,
  WidthType, ShadingType, Table, TableRow, TableCell,
} from 'docx'

export async function generateDataDescriptorDocx({ fullData = {}, ...dd }) {
  const d1   = fullData.dataset1      || {}
  const cust = fullData.custodian     || {}
  const cont = fullData.contactperson || {}
  const contr= fullData.contribution  || {}

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

  // ── author list ───────────────────────────────────────────────────────────
  const authorNames = (contr.authors || []).map(a =>
    a.selectedAuthor
      ? a.selectedAuthor.split('/').pop()
      : `${a.firstName || ''} ${a.lastName || ''}`.trim()
  ).filter(Boolean)

  const custodianName = `${cust.firstName || ''} ${cust.familyName || ''}`.trim()

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
  if (authorNames.length || custodianName) {
    push(h1('Authors'))
    push(...bodyLines(authorNames.join(', ') || custodianName))
    push(divider())
  }

  // AFFILIATIONS
  if (dd.affiliations || cust.institution) {
    push(h1('Affiliations'))
    push(...bodyLines(dd.affiliations || cust.institution))
    push(divider())
  }

  // CORRESPONDING AUTHOR
  if (dd.correspondingAuthor || cont.email) {
    push(h1('Corresponding Author(s)'))
    push(...bodyLines(dd.correspondingAuthor || `${custodianName}: ${cust.email || ''}`))
    push(divider())
  }

  // DATA DESCRIPTION
  push(h1('Data Description'))
  push(...QA('What type of data do you share?', dd.dataType))
  push(...QA('What is the primary objective of your investigation?', dd.objective))
  push(...QA('How were the data created? What methods and materials were used?', dd.methodsDescription))
  push(...QA('What are the key findings / results?', dd.keyResults))
  push(...QA('What is the key contribution of your data to the field?', dd.dataContribution))
  if (dd.conclusions)        push(...QA('What conclusions can be drawn from your data?', dd.conclusions))
  if (dd.limitations)        push(...QA('Were there any limitations in your study?', dd.limitations))
  if (dd.futureImplications) push(...QA('What are the future implications and potential reuses?', dd.futureImplications))
  push(divider())

  // MATERIALS AND METHODS
  push(h1('Materials and Methods'))
  push(...QA('What materials / specimens were used to generate the data?', dd.materialsSpecimens))
  push(...QA('What acquisition techniques were employed?', dd.acquisitionTechniques))
  push(...QA('What tools and workflows were utilised?', dd.tools))
  if (dd.anatomicalEntity) push(...QA('What anatomical entity was examined?', dd.anatomicalEntity))
  if (dd.previousWork)     push(...QA('Previous work and published methods', dd.previousWork))
  push(divider())

  // USAGE NOTES
  push(h1('Usage Notes'))
  push(...QA('Recommended use cases', dd.usageNotes))
  if (dd.usageLimitations) push(...QA('How should the data NOT be used?', dd.usageLimitations))
  if (dd.code)             push(...QA('Complementary code / software', dd.code))
  push(divider())

  // DATA RECORDS
  push(h1('Data Records'))
  if (dd.dataRepository) {
    push(h2('Repository'))
    push(...bodyLines(dd.dataRepository))
  }
  push(...QA('Dataset file structure', dd.dataRecordsLayout))
  if (dd.fileFormats) push(...QA('File formats', dd.fileFormats))
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