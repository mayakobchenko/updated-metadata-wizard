// ── generateMetadataDocx.js ───────────────────────────────────────────────────
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Table, TableRow, TableCell,
  WidthType, ShadingType, Header, Footer, PageNumber,
} from 'docx'

// reuse the same lookup builder from the PDF module
import { buildLookups, resolve } from './metadataLookups'

export async function generateMetadataDocx(formData) {
  const lookups = await buildLookups()

  const d1    = formData.dataset1       || {}
  const d2    = formData.dataset2       || {}
  const cust  = formData.custodian      || {}
  const cont  = formData.contactperson  || {}
  const gl    = formData.groupLeader    || {}
  const exp   = formData.experiments    || {}
  const fund  = formData.funding        || {}
  const contr = formData.contribution   || {}
  const subj  = formData.subjectMetadata|| {}

  // ── helpers ───────────────────────────────────────────────────────────────

  const heading = (text, level = HeadingLevel.HEADING_1) =>
    new Paragraph({
      text,
      heading: level,
      spacing: { before: 240, after: 120 },
    })

  const row = (label, value) => {
    if (!value || value === '(unknown)') return null
    return new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: label, bold: true, size: 18, color: '00539C' })]
          })],
          width: { size: 30, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.SOLID, color: 'E8F2FC' },
          margins: { top: 60, bottom: 60, left: 80, right: 80 },
        }),
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: String(value), size: 18, color: '3C3C3C' })]
          })],
          width: { size: 70, type: WidthType.PERCENTAGE },
          margins: { top: 60, bottom: 60, left: 80, right: 80 },
        }),
      ]
    })
  }

  const table = (rows) => {
    const validRows = rows.filter(Boolean)
    if (!validRows.length) return null
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top:           { style: BorderStyle.SINGLE, size: 1, color: 'C8D7E6' },
        bottom:        { style: BorderStyle.SINGLE, size: 1, color: 'C8D7E6' },
        left:          { style: BorderStyle.SINGLE, size: 1, color: 'C8D7E6' },
        right:         { style: BorderStyle.SINGLE, size: 1, color: 'C8D7E6' },
        insideH:       { style: BorderStyle.SINGLE, size: 1, color: 'C8D7E6' },
        insideV:       { style: BorderStyle.SINGLE, size: 1, color: 'C8D7E6' },
      },
      rows: validRows,
    })
  }

  const spacer = () => new Paragraph({ text: '', spacing: { after: 120 } })

  // ── build sections ────────────────────────────────────────────────────────

  const sections = []

  const push = (...items) => items.forEach(i => i && sections.push(i))

  // title
  push(new Paragraph({
    children: [new TextRun({ text: 'EBRAINS Metadata Summary', bold: true, size: 32, color: '00539C' })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
  }))
  push(new Paragraph({
    children: [new TextRun({
      text: `Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`,
      size: 16, color: '787878', italics: true
    })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
  }))

  // ── 1. Dataset ────────────────────────────────────────────────────────────
  push(heading('1. Dataset Information'))
  push(table([
    row('Full title',      d1.dataTitle),
    row('Short name',      d1.shortTitle),
    row('Description',     d1.briefSummary),
    row('License',         resolve(d1.license, lookups.licenseMap)),
    row('Data types',      resolve(d1.optionsData, lookups.dataTypeMap)),
    row('Data standards',  Array.isArray(d1.dataStandart) ? d1.dataStandart.join(', ') : d1.dataStandart),
    row('Embargo',         d1.embargo ? `Yes${d1.embargoDate ? ` (until ${new Date(d1.embargoDate).toLocaleDateString('en-GB')})` : ''}` : 'No'),
    row('Homepage',        d2.homePage || d2.Data2UrlDoiRepo),
    row('Related DOI',     d2.Data2DoiJournal),
  ]))
  push(spacer())

  // ── 2. People ─────────────────────────────────────────────────────────────
  push(heading('2. People'))

  if (cust.firstName || cust.familyName) {
    push(heading('Custodian', HeadingLevel.HEADING_2))
    push(table([
      row('Name',        `${cust.firstName || ''} ${cust.familyName || ''}`.trim()),
      row('Email',       cust.email),
      row('ORCID',       cust.orcid),
      row('Institution', cust.institution),
    ]))
    push(spacer())
  }

  if (cont.firstName || cont.familyName) {
    push(heading('Contact Person', HeadingLevel.HEADING_2))
    push(table([
      row('Name',  `${cont.firstName || ''} ${cont.familyName || ''}`.trim()),
      row('Email', cont.email),
    ]))
    push(spacer())
  }

  const authors = contr.authors || []
  if (authors.length) {
    push(heading('Authors', HeadingLevel.HEADING_2))
    push(table(authors.map((a, i) => {
      const name = a.selectedAuthor
        ? (lookups.contributorMap.get(a.selectedAuthor) || a.selectedAuthor)
        : `${a.firstName || ''} ${a.lastName || ''}`.trim()
      return row(`Author ${i + 1}`, name + (a.orcid ? ` (ORCID: ${a.orcid})` : ''))
    })))
    push(spacer())
  }

  const otherContrs = contr.contributor?.othercontr || []
  if (otherContrs.length) {
    push(heading('Other Contributors', HeadingLevel.HEADING_2))
    push(table(otherContrs.map((c, i) => {
      const name = c.selectedOtherContr
        ? (lookups.contributorMap.get(c.selectedOtherContr) || c.selectedOtherContr)
        : `${c.firstName || ''} ${c.lastName || ''}`.trim()
      const types = resolve(c.selectedTypeContr || c.contributionTypes || [], lookups.contribTypeMap)
      return row(`Contributor ${i + 1}`, `${name}${types && types !== '(unknown)' ? ` [${types}]` : ''}`)
    })))
    push(spacer())
  }

  // ── 3. Experiments ────────────────────────────────────────────────────────
  push(heading('3. Experiments'))
  push(table([
    row('Experimental approaches', resolve(exp.experimentalApproach, lookups.approachMap)),
    row('Techniques',              resolve(exp.techniques,            lookups.techniqueMap)),
    row('Preparation types',       resolve(exp.preparationTypes,      lookups.prepTypeMap)),
    row('Study targets',           resolve(exp.studyTargets,          lookups.studyTargetMap)),
  ]))
  push(spacer())

  // ── 4. Funding ────────────────────────────────────────────────────────────
  const funders = fund.funders || []
  if (funders.length) {
    push(heading('4. Funding'))
    funders.forEach((f, i) => {
      const funderName = f.selectedFundingId
        ? (lookups.funderMap.get(f.selectedFundingId) || f.selectedFundingId)
        : (f.funderName || f.customFunderName || '')
      push(heading(`Grant ${i + 1}`, HeadingLevel.HEADING_2))
      push(table([
        row('Funder',       funderName),
        row('Award title',  f.awardTitle  || f.customAwardTitle),
        row('Award number', f.awardNumber || f.customAwardNumber),
      ]))
      push(spacer())
    })
  }

  // ── 5. Subjects ───────────────────────────────────────────────────────────
  const flatSubjects   = subj.subjects          || []
  const subjectGroups  = subj.subjectGroups      || []
  const tissueSamples  = subj.tissueSamples      || []
  const tissueCollects = subj.tissueCollections  || []
  const hasSpecimen    = flatSubjects.length || subjectGroups.length ||
                         tissueSamples.length || tissueCollects.length

  if (hasSpecimen) {
    push(heading('5. Subjects & Tissue Samples'))
    if (flatSubjects.length) {
      push(heading(`Subjects (${flatSubjects.length})`, HeadingLevel.HEADING_2))
      push(table(flatSubjects.map((s, i) =>
        row(`Subject ${i + 1}`,
          [s.subjectID, s.species && `Species: ${s.species}`, s.strain && `Strain: ${s.strain}`,
           s.bioSex && `Sex: ${s.bioSex}`, s.age && `Age: ${s.age}`].filter(Boolean).join(' | ')
        )
      )))
      push(spacer())
    }
    if (subjectGroups.length) {
      push(heading(`Subject Groups (${subjectGroups.length})`, HeadingLevel.HEADING_2))
      push(table(subjectGroups.map((g, i) =>
        row(`Group ${i + 1}`, `${g.name || `Group ${i + 1}`} — ${g.subjects?.length || 0} subjects`)
      )))
      push(spacer())
    }
    if (tissueSamples.length) {
      push(heading(`Tissue Samples (${tissueSamples.length})`, HeadingLevel.HEADING_2))
      push(table(tissueSamples.map((s, i) =>
        row(`Sample ${i + 1}`,
          [s.sampleID, s.type && `Type: ${s.type}`, s.species && `Species: ${s.species}`].filter(Boolean).join(' | ')
        )
      )))
      push(spacer())
    }
  }

  // ── generate and download ─────────────────────────────────────────────────
  const doc = new Document({
    creator:     'EBRAINS Metadata Wizard',
    title:       d1.dataTitle || 'Metadata Summary',
    description: 'Generated by EBRAINS Metadata Wizard',
    sections: [{
      headers: {
        default: new Header({
          children: [new Paragraph({
            children: [new TextRun({ text: 'EBRAINS Metadata Wizard', bold: true, color: '00539C', size: 16 })],
          })]
        })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            children: [
              new TextRun({ text: 'Page ', size: 16, color: '787878' }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '787878' }),
              new TextRun({ text: ' of ', size: 16, color: '787878' }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '787878' }),
            ],
            alignment: AlignmentType.RIGHT,
          })]
        })
      },
      children: sections,
    }]
  })

  const blob   = await Packer.toBlob(doc)
  const url    = URL.createObjectURL(blob)
  const a      = document.createElement('a')
  const safe   = (d1.dataTitle || 'metadata').replace(/[^a-z0-9]/gi, '_').slice(0, 40).toLowerCase()
  a.href       = url
  a.download   = `${safe}_metadata.docx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}