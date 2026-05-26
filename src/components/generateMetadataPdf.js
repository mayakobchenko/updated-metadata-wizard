// ── generateMetadataPdf.js ────────────────────────────────────────────────────
import { jsPDF } from 'jspdf'
import { buildLookups, resolve } from './metadataLookups'

// EBRAINS green palette
const GREEN      = [0,   201,  89]   // #00C959
const LIGHTGREEN = [230, 250, 238]   // very light green tint
const DARKGREY   = [50,  50,  50]
const MIDGREY    = [110, 110, 110]
const WHITE      = [255, 255, 255]
const DIVIDER    = [210, 235, 220]

export async function generateMetadataPdf(formData) {
  const lookups = await buildLookups()
  const doc     = new jsPDF({ unit: 'mm', format: 'a4' })
  const W       = doc.internal.pageSize.getWidth()
  const H       = doc.internal.pageSize.getHeight()
  const margin  = 18
  const maxW    = W - margin * 2
  let y         = margin

  // ── helpers ───────────────────────────────────────────────────────────────

  function checkPage(needed = 12) {
    if (y + needed > H - 14) {
      doc.addPage()
      y = margin + 4
    }
  }

  function drawPageHeader() {
    doc.setFillColor(...GREEN)
    doc.rect(0, 0, W, 22, 'F')
    doc.setTextColor(...WHITE)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('EBRAINS Metadata Wizard', margin, 10)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('Dataset Metadata Summary', margin, 16)
    const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    doc.setFontSize(8)
    doc.text(dateStr, W - margin, 16, { align: 'right' })
    y = 28
  }

  function drawFooter() {
    const pages = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i)
      doc.setFillColor(...GREEN)
      doc.rect(0, H - 10, W, 10, 'F')
      doc.setTextColor(...WHITE)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.text('EBRAINS Metadata Wizard', margin, H - 4)
      doc.text(`Page ${i} of ${pages}`, W - margin, H - 4, { align: 'right' })
    }
  }

  function sectionTitle(title) {
    checkPage(18)
    y += 5
    doc.setFillColor(...LIGHTGREEN)
    doc.roundedRect(margin, y, maxW, 9, 1.5, 1.5, 'F')
    // left accent bar
    doc.setFillColor(...GREEN)
    doc.rect(margin, y, 3, 9, 'F')
    doc.setTextColor(...GREEN)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(title.toUpperCase(), margin + 6, y + 6.2)
    y += 14
  }

function subheading(text) {
  checkPage(10)
  y += 3
  doc.setTextColor(...GREEN)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(`>  ${text}`, margin + 2, y)   // ← plain ASCII > instead of ▸
  y += 6
}

  // field: label on the left, value on the right — NO divider lines
  function field(label, value) {
    if (!value || value === '') return
    const labelW = 50
    const valueX = margin + labelW
    const valueW = maxW - labelW

    doc.setFontSize(8.5)
    const lines  = doc.splitTextToSize(String(value), valueW)
    const lineH  = 4.8
    const blockH = lines.length * lineH + 3

    checkPage(blockH)

    // subtle alternating background (every other field)
    doc.setTextColor(...MIDGREY)
    doc.setFont('helvetica', 'bold')
    doc.text(label, margin, y + 3.5)

    doc.setTextColor(...DARKGREY)
    doc.setFont('helvetica', 'normal')
    doc.text(lines, valueX, y + 3.5)

    y += blockH
  }

  // ── render ────────────────────────────────────────────────────────────────

  drawPageHeader()

  const d1    = formData.dataset1        || {}
  const d2    = formData.dataset2        || {}
  const cust  = formData.custodian       || {}
  const cont  = formData.contactperson   || {}
  const gl    = formData.groupLeader     || {}
  const exp   = formData.experiments     || {}
  const fund  = formData.funding         || {}
  const contr = formData.contribution    || {}
  const subj  = formData.subjectMetadata || {}

  // ── 1. Dataset ────────────────────────────────────────────────────────────
  sectionTitle('1. Dataset Information')
  field('Full title',     d1.dataTitle)
  field('Short name',     d1.shortTitle)
  field('Description',    d1.briefSummary)
  field('License',        resolve(d1.license, lookups.licenseMap))
  field('Data types',     resolve(d1.optionsData, lookups.dataTypeMap))
  field('Data standards', Array.isArray(d1.dataStandart) ? d1.dataStandart.join(', ') : d1.dataStandart)
  field('Embargo',        d1.embargo
    ? `Yes${d1.embargoDate ? ` (until ${new Date(d1.embargoDate).toLocaleDateString('en-GB')})` : ''}`
    : 'No')
  field('Homepage',       d2.homePage || d2.Data2UrlDoiRepo)
  field('Related DOI',    d2.Data2DoiJournal)
  const pubs = (d2.relatedPublications || []).map(p => p.newPublication).filter(Boolean)
  if (pubs.length) field('Related publications', pubs.join('; '))
  const channels = (d2.supportChannels || []).map(c => c.newChannel).filter(Boolean)
  if (channels.length) field('Support channels', channels.join(', '))

  // ── 2. People ─────────────────────────────────────────────────────────────
  sectionTitle('2. People')

  if (cust.firstName || cust.familyName) {
    subheading('Custodian')
    field('Name',        `${cust.firstName || ''} ${cust.familyName || ''}`.trim())
    field('Email',       cust.email)
    field('ORCID',       cust.orcid)
    field('Institution', cust.institution)
  }

  if (cont.firstName || cont.familyName) {
    subheading('Contact Person')
    field('Name',  `${cont.firstName || ''} ${cont.familyName || ''}`.trim())
    field('Email', cont.email)
  }

  if (gl.name) {
    subheading('Group Leader')
    field('Name',  gl.name)
    field('ORCID', gl.orcid)
  }

  const authors = contr.authors || []
  if (authors.length) {
    subheading('Authors')
    authors.forEach((a, i) => {
      const name = a.selectedAuthor
        ? (resolve(a.selectedAuthor, lookups.contributorMap) || a.selectedAuthor)
        : `${a.firstName || ''} ${a.lastName || ''}`.trim()
      if (name) field(`Author ${i + 1}`, name + (a.orcid ? `  (ORCID: ${a.orcid})` : ''))
    })
  }

  const otherContrs = contr.contributor?.othercontr || []
  if (otherContrs.length) {
    subheading('Other Contributors')
    otherContrs.forEach((c, i) => {
      const name = c.selectedOtherContr
        ? (resolve(c.selectedOtherContr, lookups.contributorMap) || c.selectedOtherContr)
        : `${c.firstName || ''} ${c.lastName || ''}`.trim()
      const types = resolve(c.selectedTypeContr || c.contributionTypes || [], lookups.contribTypeMap)
      if (name) field(`Contributor ${i + 1}`, `${name}${types ? `  [${types}]` : ''}`)
    })
  }

  // ── 3. Experiments ────────────────────────────────────────────────────────
  sectionTitle('3. Experiments')
  field('Experimental approaches', resolve(exp.experimentalApproach, lookups.approachMap))
  field('Techniques',              resolve(exp.techniques,            lookups.techniqueMap))
  field('Preparation types',       resolve(exp.preparationTypes,      lookups.prepTypeMap))
  field('Study targets',           resolve(exp.studyTargets,          lookups.studyTargetMap))
  if (exp.keywords) field('Keywords', exp.keywords)

  // ── 4. Funding ────────────────────────────────────────────────────────────
  const funders = fund.funders || []
  if (funders.length) {
    sectionTitle('4. Funding')
    funders.forEach((f, i) => {
      subheading(`Grant ${i + 1}`)
      const funderName = f.selectedFundingId
        ? (resolve(f.selectedFundingId, lookups.funderMap) || f.selectedFundingId)
        : (f.funderName || f.customFunderName || '')
      field('Funder',       funderName)
      field('Award title',  f.awardTitle  || f.customAwardTitle)
      field('Award number', f.awardNumber || f.grantId || f.customAwardNumber)
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
    sectionTitle('5. Subjects & Tissue Samples')

    // ── helper: render one subject's details ─────────────────────────────
    function renderSubject(s, label) {
      subheading(label)
      field('Subject ID',    s.subjectID)
      field('Species',       resolve(s.species,  lookups.speciesMap))
      field('Strain',        resolve(s.strain,   lookups.strainMap))
      field('Biological sex',resolve(s.bioSex,   lookups.bioSexMap))
      field('Age category',  resolve(s.ageCategory, lookups.ageCatMap))
      if (s.age) field('Age', `${s.age}${s.ageUnit ? ' ' + resolve(s.ageUnit, lookups.ageCatMap) : ''}`)
      if (s.weight) field('Weight', `${s.weight}`)
      field('Handedness',    resolve(s.handedness, lookups.handednessMap))
      const diseases = [
        ...((s.disease      || []).map(d => resolve(d, lookups.diseaseMap))),
        ...((s.diseaseModel || []).map(d => resolve(d, lookups.diseaseMap))),
      ].filter(Boolean)
      if (diseases.length) field('Pathology', diseases.join(', '))
      const attrs = (s.subjectAttribute || []).map(a => resolve(a, lookups.subjectAttrMap)).filter(Boolean)
      if (attrs.length) field('Attributes', attrs.join(', '))
      if (s.additionalRemarks) field('Remarks', s.additionalRemarks)
    }

    if (flatSubjects.length) {
      flatSubjects.forEach((s, i) => renderSubject(s, `Subject ${i + 1}`))
    }

    if (subjectGroups.length) {
      subjectGroups.forEach((g, gi) => {
        subheading(`Group ${gi + 1}: ${g.name || ''}  (${g.subjects?.length || 0} subjects)`)
        if (g.additionalRemarks) field('Group remarks', g.additionalRemarks)
        ;(g.subjects || []).forEach((s, si) =>
          renderSubject(s, `  Subject ${si + 1} of group ${gi + 1}`)
        )
      })
    }

    if (tissueSamples.length) {
      tissueSamples.forEach((s, i) => {
        subheading(`Tissue Sample ${i + 1}`)
        field('Sample ID',     s.sampleID)
        field('Type',          resolve(s.type,         lookups.tissueAttrMap))
        field('Species',       resolve(s.species,      lookups.speciesMap))
        field('Strain',        resolve(s.strain,       lookups.strainMap))
        field('Biological sex',resolve(s.biologicalSex,lookups.bioSexMap))
        field('Laterality',    s.laterality)
        field('Origin',        resolve(s.origin,       lookups.organMap))
        if (s.additionalRemarks) field('Remarks', s.additionalRemarks)
      })
    }

    if (tissueCollects.length) {
      tissueCollects.forEach((c, i) => {
        subheading(`Tissue Collection ${i + 1}: ${c.collectionID || ''}  (${c.samples?.length || 0} samples)`)
        ;(c.samples || []).forEach((s, si) => {
          field(`Sample ${si + 1}`,
            [s.sampleID,
             resolve(s.species, lookups.speciesMap) && `Species: ${resolve(s.species, lookups.speciesMap)}`,
             resolve(s.type,    lookups.tissueAttrMap) && `Type: ${resolve(s.type, lookups.tissueAttrMap)}`,
            ].filter(Boolean).join('  |  ')
          )
        })
      })
    }
  }

  drawFooter()

  const safe = (d1.dataTitle || 'metadata').replace(/[^a-z0-9]/gi, '_').slice(0, 40).toLowerCase()
  doc.save(`${safe}_metadata.pdf`)
}