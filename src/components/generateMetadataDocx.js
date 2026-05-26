import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Table, TableRow, TableCell,
  WidthType, ShadingType, Header, Footer, PageNumber,
} from 'docx'
import { buildLookups, resolve } from './metadataLookups'

export async function generateMetadataDocx(formData) {
  const lookups = await buildLookups()

  const d1    = formData.dataset1        || {}
  const d2    = formData.dataset2        || {}
  const cust  = formData.custodian       || {}
  const cont  = formData.contactperson   || {}
  const gl    = formData.groupLeader     || {}
  const exp   = formData.experiments     || {}
  const fund  = formData.funding         || {}
  const contr = formData.contribution    || {}
  const subj  = formData.subjectMetadata || {}

  // ── helpers ───────────────────────────────────────────────────────────────

  const heading = (text, level = HeadingLevel.HEADING_1) =>
    new Paragraph({ text, heading: level, spacing: { before: 240, after: 120 } })

  const row = (label, value) => {
    if (!value || value === '') return null
    return new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: label, bold: true, size: 18, color: '00C959' })]
          })],
          width: { size: 30, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.SOLID, color: 'E6FAF0' },
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
        top:     { style: BorderStyle.SINGLE, size: 1, color: 'C8D7E6' },
        bottom:  { style: BorderStyle.SINGLE, size: 1, color: 'C8D7E6' },
        left:    { style: BorderStyle.SINGLE, size: 1, color: 'C8D7E6' },
        right:   { style: BorderStyle.SINGLE, size: 1, color: 'C8D7E6' },
        insideH: { style: BorderStyle.SINGLE, size: 1, color: 'C8D7E6' },
        insideV: { style: BorderStyle.SINGLE, size: 1, color: 'C8D7E6' },
      },
      rows: validRows,
    })
  }

  const spacer = () => new Paragraph({ text: '', spacing: { after: 80 } })

  // ── subject table helper ──────────────────────────────────────────────────

  const subjectTable = (s) => table([
    row('Subject ID',      s.subjectID),
    row('Species',         resolve(s.species,      lookups.speciesMap)),
    row('Strain',          resolve(s.strain,       lookups.strainMap)),
    row('Biological sex',  resolve(s.bioSex,       lookups.bioSexMap)),
    row('Age category',    resolve(s.ageCategory,  lookups.ageCatMap)),
    s.age    ? row('Age',    `${s.age}`) : null,
    s.weight ? row('Weight', `${s.weight}`) : null,
    row('Handedness',      resolve(s.handedness,   lookups.handednessMap)),
    row('Pathology',       [
      ...((s.disease      || []).map(d => resolve(d, lookups.diseaseMap))),
      ...((s.diseaseModel || []).map(d => resolve(d, lookups.diseaseMap))),
    ].filter(Boolean).join(', ')),
    row('Attributes',      (s.subjectAttribute || []).map(a => resolve(a, lookups.subjectAttrMap)).filter(Boolean).join(', ')),
    row('Remarks',         s.additionalRemarks),
  ])

  // ── tissue sample table helper ────────────────────────────────────────────

  const tissueTable = (s) => table([
    row('Sample ID',       s.sampleID),
    row('Type',            resolve(s.type,          lookups.tissueSampleTypeMap)),
    row('Species',         resolve(s.species,        lookups.speciesMap)),
    row('Strain',          resolve(s.strain,         lookups.strainMap)),
    row('Biological sex',  resolve(s.biologicalSex,  lookups.bioSexMap)),
    row('Laterality',      resolve(s.laterality,     lookups.lateralityMap)),
    row('Origin',          resolve(s.origin,         lookups.organMap)),
    s.age    ? row('Age',    `${s.age}`) : null,
    s.weight ? row('Weight', `${s.weight}`) : null,
    row('Pathology',       (s.pathology || []).map(p => resolve(p, lookups.diseaseMap)).filter(Boolean).join(', ')),
    row('Attributes',      (s.tissueSampleAttribute || []).map(a => resolve(a, lookups.tissueAttrMap)).filter(Boolean).join(', ')),
    row('Remarks',         s.additionalRemarks),
  ])

  // ── build document sections ───────────────────────────────────────────────

  const sections = []
  const push = (...items) => items.forEach(i => i && sections.push(i))

  // title block
  push(new Paragraph({
    children: [new TextRun({ text: 'EBRAINS Metadata Summary', bold: true, size: 32, color: '00C959' })],
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
    row('Full title',     d1.dataTitle),
    row('Short name',     d1.shortTitle),
    row('Description',    d1.briefSummary),
    row('License',        resolve(d1.license, lookups.licenseMap)),
    row('Data types',     resolve(d1.optionsData, lookups.dataTypeMap)),
    row('Data standards', Array.isArray(d1.dataStandart) ? d1.dataStandart.join(', ') : d1.dataStandart),
    row('Embargo',        d1.embargo
      ? `Yes${d1.embargoDate ? ` (until ${new Date(d1.embargoDate).toLocaleDateString('en-GB')})` : ''}`
      : 'No'),
    row('Homepage',       d2.homePage || d2.Data2UrlDoiRepo),
    row('Related DOI',    d2.Data2DoiJournal),
    row('Related publications', (d2.relatedPublications || []).map(p => p.newPublication).filter(Boolean).join('; ')),
    row('Support channels',     (d2.supportChannels     || []).map(c => c.newChannel).filter(Boolean).join(', ')),
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

  if (gl.name) {
    push(heading('Group Leader', HeadingLevel.HEADING_2))
    push(table([
      row('Name',  gl.name),
      row('ORCID', gl.orcid),
    ]))
    push(spacer())
  }

  const authors = contr.authors || []
  if (authors.length) {
    push(heading('Authors', HeadingLevel.HEADING_2))
    push(table(authors.map((a, i) => {
      const name = a.selectedAuthor
        ? (resolve(a.selectedAuthor, lookups.contributorMap) || a.selectedAuthor)
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
        ? (resolve(c.selectedOtherContr, lookups.contributorMap) || c.selectedOtherContr)
        : `${c.firstName || ''} ${c.lastName || ''}`.trim()
      const types = resolve(c.selectedTypeContr || c.contributionTypes || [], lookups.contribTypeMap)
      return row(`Contributor ${i + 1}`, `${name}${types ? ` [${types}]` : ''}`)
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
    row('Keywords',                exp.keywords),
  ]))
  push(spacer())

  // ── 4. Funding ────────────────────────────────────────────────────────────
  const funders = fund.funders || []
  if (funders.length) {
    push(heading('4. Funding'))
    funders.forEach((f, i) => {
      const funderName = f.selectedFundingId
        ? (resolve(f.selectedFundingId, lookups.funderMap) || f.selectedFundingId)
        : (f.funderName || f.customFunderName || '')
      push(heading(`Grant ${i + 1}`, HeadingLevel.HEADING_2))
      push(table([
        row('Funder',       funderName),
        row('Award title',  f.awardTitle  || f.customAwardTitle),
        row('Award number', f.awardNumber || f.grantId || f.customAwardNumber),
      ]))
      push(spacer())
    })
  }

  // ── 5. Subjects & Tissue Samples ─────────────────────────────────────────
  const flatSubjects   = subj.subjects          || []
  const subjectGroups  = subj.subjectGroups      || []
  const tissueSamples  = subj.tissueSamples      || []
  const tissueCollects = subj.tissueCollections  || []
  const hasSpecimen    = flatSubjects.length || subjectGroups.length ||
                         tissueSamples.length || tissueCollects.length

  if (hasSpecimen) {
    push(heading('5. Subjects & Tissue Samples'))

    // flat subjects
    if (flatSubjects.length) {
      flatSubjects.forEach((s, i) => {
        push(heading(`Subject ${i + 1}`, HeadingLevel.HEADING_2))
        push(subjectTable(s))
        push(spacer())
      })
    }

    // subject groups — expand each subject
    if (subjectGroups.length) {
      subjectGroups.forEach((g, gi) => {
        push(heading(`Group ${gi + 1}: ${g.name || ''}  (${g.subjects?.length || 0} subjects)`, HeadingLevel.HEADING_2))
        if (g.additionalRemarks) {
          push(table([row('Group remarks', g.additionalRemarks)]))
          push(spacer())
        }
        ;(g.subjects || []).forEach((s, si) => {
          push(heading(`Subject ${si + 1} of group ${gi + 1}`, HeadingLevel.HEADING_3))
          push(subjectTable(s))
          push(spacer())
        })
      })
    }

    // flat tissue samples
    if (tissueSamples.length) {
      tissueSamples.forEach((s, i) => {
        push(heading(`Tissue Sample ${i + 1}`, HeadingLevel.HEADING_2))
        push(tissueTable(s))
        push(spacer())
      })
    }

    // tissue collections
    if (tissueCollects.length) {
      tissueCollects.forEach((c, ci) => {
        push(heading(`Tissue Collection ${ci + 1}: ${c.collectionID || ''}  (${c.samples?.length || 0} samples)`, HeadingLevel.HEADING_2))
        if (c.additionalRemarks) {
          push(table([row('Collection remarks', c.additionalRemarks)]))
          push(spacer())
        }
        ;(c.samples || []).forEach((s, si) => {
          push(heading(`Sample ${si + 1}`, HeadingLevel.HEADING_3))
          push(tissueTable(s))
          push(spacer())
        })
      })
    }
  }

  // ── generate ──────────────────────────────────────────────────────────────
  const doc = new Document({
    creator:     'EBRAINS Metadata Wizard',
    title:       d1.dataTitle || 'Metadata Summary',
    description: 'Generated by EBRAINS Metadata Wizard',
    sections: [{
      headers: {
        default: new Header({
          children: [new Paragraph({
            children: [new TextRun({ text: 'EBRAINS Metadata Wizard', bold: true, color: '00C959', size: 16 })]
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

  const blob = await Packer.toBlob(doc)
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  const safe = (d1.dataTitle || 'metadata').replace(/[^a-z0-9]/gi, '_').slice(0, 40).toLowerCase()
  a.href     = url
  a.download = `${safe}_metadata.docx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}