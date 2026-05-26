// ── generateMetadataPdf.js ────────────────────────────────────────────────────
// Generates a human-readable PDF from the Metadata Wizard form data.
// All KG IDs are resolved to names using the existing backend endpoints.

import { jsPDF } from 'jspdf'

// ── fetch helpers — resolve IDs to names via existing KG info endpoints ───────

async function fetchJson(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

async function buildLookups() {
  const [
    licensesRes,
    dataTypesRes,
    techniquesRes,
    studyTargetsRes,
    approachesRes,
    prepTypesRes,
    contribTypesRes,
    contributorsRes,
    fundingRes,
  ] = await Promise.all([
    fetchJson('/api/kginfo/license'),
    fetchJson('/api/kginfo/datatypes'),
    fetchJson('/api/kginfo/techniques'),
    fetchJson('/api/kginfo/studytargets'),
    fetchJson('/api/kginfo/experimentalapproaches'),
    fetchJson('/api/kginfo/preparationtypes'),
    fetchJson('/api/kginfo/typecontribution'),
    fetchJson('/api/kginfo/contributorsfile'),
    fetchJson('/api/kginfo/funding'),
  ])

  const toMap = (arr, idKey = 'identifier', nameKey = 'name') => {
    const m = new Map()
    if (!Array.isArray(arr)) return m
    arr.forEach(item => {
      if (item[idKey] && item[nameKey]) m.set(item[idKey], item[nameKey])
    })
    return m
  }

  // licenses: { identifier, shortName, fullName }
  const licenseMap = new Map()
  const licenses = licensesRes?.licenses || licensesRes || []
  if (Array.isArray(licenses)) {
    licenses.forEach(l => {
      if (l.identifier) licenseMap.set(l.identifier, l.shortName || l.fullName || l.identifier)
    })
  }

  // data types
  const dataTypeMap = toMap(dataTypesRes?.dataTypes || [], 'identifier', 'name')

  // techniques — flat array [{identifier, name, type}]
  const techniqueMap = new Map()
  const techniques = techniquesRes?.techniques || techniquesRes || []
  if (Array.isArray(techniques)) {
    techniques.forEach(t => {
      if (t.identifier) techniqueMap.set(t.identifier, t.name)
    })
  }

  // study targets — flat array [{identifier, name, type}]
  const studyTargetMap = new Map()
  const studyTargets = studyTargetsRes?.studyTargets || studyTargetsRes || []
  if (Array.isArray(studyTargets)) {
    studyTargets.forEach(t => {
      if (t.identifier) studyTargetMap.set(t.identifier, t.name)
    })
  }

  // experimental approaches
  const approachMap = toMap(approachesRes?.experimentalApproaches || approachesRes || [], 'identifier', 'name')

  // preparation types
  const prepTypeMap = toMap(prepTypesRes?.preparationTypes || prepTypesRes || [], 'identifier', 'name')

  // contribution types
  const contribTypeMap = toMap(contribTypesRes?.contributionTypes || contribTypesRes || [], 'identifier', 'name')

  // contributors: [{uuid, givenName, familyName}]
  const contributorMap = new Map()
  const contributors = contributorsRes?.persons || contributorsRes || []
  if (Array.isArray(contributors)) {
    contributors.forEach(p => {
      if (p.uuid) {
        contributorMap.set(p.uuid, `${p.givenName || ''} ${p.familyName || ''}`.trim())
      }
    })
  }

  // funding/funders: [{id, name}]
  const funderMap = new Map()
  const fundingData = fundingRes?.funding || fundingRes || []
  if (Array.isArray(fundingData)) {
    fundingData.forEach(f => {
      if (f.id) funderMap.set(f.id, f.funderName || f.name || f.id)
    })
  }

  return {
    licenseMap, dataTypeMap, techniqueMap, studyTargetMap,
    approachMap, prepTypeMap, contribTypeMap, contributorMap, funderMap
  }
}

// ── resolve a single ID or array of IDs using a lookup map ───────────────────

function resolve(idOrIds, map, fallback = '(unknown)') {
  if (!idOrIds) return fallback
  if (Array.isArray(idOrIds)) {
    const names = idOrIds.map(id => map.get(id) || id).filter(Boolean)
    return names.length ? names.join(', ') : fallback
  }
  return map.get(idOrIds) || idOrIds || fallback
}

// ── PDF builder ───────────────────────────────────────────────────────────────

export async function generateMetadataPdf(formData) {
  const lookups = await buildLookups()

  const doc    = new jsPDF({ unit: 'mm', format: 'a4' })
  const W      = doc.internal.pageSize.getWidth()
  const H      = doc.internal.pageSize.getHeight()
  const margin = 18
  const col    = margin
  const maxW   = W - margin * 2

  let y = margin

  // ── colour palette ────────────────────────────────────────────────────────
  const BLUE      = [0,   83,  156]   // EBRAINS dark blue
  const LIGHTBLUE = [232, 242, 252]
  const DARKGREY  = [60,  60,  60]
  const MIDGREY   = [120, 120, 120]
  const WHITE     = [255, 255, 255]
  const DIVIDER   = [200, 215, 230]

  // ── helpers ───────────────────────────────────────────────────────────────

  function checkPageBreak(needed = 10) {
    if (y + needed > H - margin) {
      doc.addPage()
      y = margin + 4
    }
  }

  function drawHeader() {
    // blue banner
    doc.setFillColor(...BLUE)
    doc.rect(0, 0, W, 22, 'F')
    doc.setTextColor(...WHITE)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('EBRAINS Metadata Wizard', margin, 10)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('Dataset Metadata Summary', margin, 16)

    // date
    const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    doc.setFontSize(8)
    doc.text(dateStr, W - margin, 16, { align: 'right' })

    y = 28
  }

  function drawFooter() {
    const pages = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i)
      doc.setFillColor(...BLUE)
      doc.rect(0, H - 10, W, 10, 'F')
      doc.setTextColor(...WHITE)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.text('EBRAINS Metadata Wizard — Confidential draft', margin, H - 4)
      doc.text(`Page ${i} of ${pages}`, W - margin, H - 4, { align: 'right' })
    }
  }

  function sectionTitle(title) {
    checkPageBreak(16)
    y += 4
    doc.setFillColor(...LIGHTBLUE)
    doc.roundedRect(col, y, maxW, 9, 1.5, 1.5, 'F')
    doc.setTextColor(...BLUE)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(title.toUpperCase(), col + 3, y + 6)
    y += 13
  }

  function field(label, value, opts = {}) {
    if (!value || value === '(unknown)' || value === '') return
    checkPageBreak(10)

    const labelW = 52
    const valueX = col + labelW
    const valueW = maxW - labelW

    // label
    doc.setTextColor(...MIDGREY)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text(label, col, y)

    // value — wrap long text
    doc.setTextColor(...DARKGREY)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const lines  = doc.splitTextToSize(String(value), valueW)
    const lineH  = 4.5
    const blockH = lines.length * lineH

    checkPageBreak(blockH + 2)
    doc.text(lines, valueX, y)
    y += Math.max(blockH, 5) + 2

    // subtle divider
    doc.setDrawColor(...DIVIDER)
    doc.setLineWidth(0.2)
    doc.line(col, y - 1, col + maxW, y - 1)
  }

  function subheading(text) {
    checkPageBreak(10)
    y += 2
    doc.setTextColor(...BLUE)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(text, col + 2, y)
    y += 5
  }

  function note(text) {
    checkPageBreak(8)
    doc.setTextColor(...MIDGREY)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    const lines = doc.splitTextToSize(text, maxW)
    doc.text(lines, col, y)
    y += lines.length * 4 + 2
  }

  // ── start drawing ─────────────────────────────────────────────────────────
  drawHeader()

  const d1   = formData.dataset1   || {}
  const d2   = formData.dataset2   || {}
  const cust = formData.custodian  || {}
  const cont = formData.contactperson || {}
  const gl   = formData.groupLeader || {}
  const exp  = formData.experiments || {}
  const fund = formData.funding     || {}
  const contr = formData.contribution || {}
  const subj = formData.subjectMetadata || {}

  // ── 1. DATASET INFORMATION ────────────────────────────────────────────────
  sectionTitle('1. Dataset Information')
  field('Full title',     d1.dataTitle)
  field('Short name',     d1.shortTitle)
  field('Description',    d1.briefSummary)
  field('License',        resolve(d1.license, lookups.licenseMap))
  field('Data types',     resolve(d1.optionsData, lookups.dataTypeMap))
  field('Data standards', Array.isArray(d1.dataStandart) ? d1.dataStandart.join(', ') : d1.dataStandart)
  field('Embargo',        d1.embargo ? `Yes${d1.embargoDate ? ` (until ${new Date(d1.embargoDate).toLocaleDateString('en-GB')})` : ''}` : 'No')
  field('Homepage',       d2.homePage || d2.Data2UrlDoiRepo)
  field('Related DOI',    d2.Data2DoiJournal)
  if (d2.supportChannels?.length) {
    field('Support channels', d2.supportChannels.map(c => c.newChannel).filter(Boolean).join(', '))
  }

  // ── 2. PEOPLE ─────────────────────────────────────────────────────────────
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

  // ── authors ───────────────────────────────────────────────────────────────
  const authors = contr.authors || []
  if (authors.length) {
    subheading('Authors')
    authors.forEach((a, i) => {
      const name = a.selectedAuthor
        ? (lookups.contributorMap.get(a.selectedAuthor) || a.selectedAuthor)
        : `${a.firstName || ''} ${a.lastName || ''}`.trim()
      if (name) field(`Author ${i + 1}`, name + (a.orcid ? `  (ORCID: ${a.orcid})` : ''))
    })
  }

  // ── other contributors ────────────────────────────────────────────────────
  const otherContrs = contr.contributor?.othercontr || []
  if (otherContrs.length) {
    subheading('Other Contributors')
    otherContrs.forEach((c, i) => {
      const name = c.selectedOtherContr
        ? (lookups.contributorMap.get(c.selectedOtherContr) || c.selectedOtherContr)
        : `${c.firstName || ''} ${c.lastName || ''}`.trim()
      const types = resolve(
        c.selectedTypeContr || c.contributionTypes || [],
        lookups.contribTypeMap
      )
      if (name) field(`Contributor ${i + 1}`, `${name}${types && types !== '(unknown)' ? `  [${types}]` : ''}`)
    })
  }

  // ── 3. EXPERIMENTS ────────────────────────────────────────────────────────
  sectionTitle('3. Experiments')
  field('Experimental approaches', resolve(exp.experimentalApproach, lookups.approachMap))
  field('Techniques',              resolve(exp.techniques,            lookups.techniqueMap))
  field('Preparation types',       resolve(exp.preparationTypes,      lookups.prepTypeMap))
  field('Study targets',           resolve(exp.studyTargets,          lookups.studyTargetMap))

  // ── 4. FUNDING ────────────────────────────────────────────────────────────
  const funders = fund.funders || []
  if (funders.length) {
    sectionTitle('4. Funding')
    funders.forEach((f, i) => {
      subheading(`Grant ${i + 1}`)
      const funderName = f.selectedFundingId
        ? (lookups.funderMap.get(f.selectedFundingId) || f.selectedFundingId)
        : (f.funderName || f.customFunderName || '')
      field('Funder',       funderName)
      field('Award title',  f.awardTitle  || f.customAwardTitle)
      field('Award number', f.awardNumber || f.customAwardNumber)
    })
  }

  // ── 5. SUBJECTS & TISSUE SAMPLES ─────────────────────────────────────────
  const flatSubjects    = subj.subjects           || []
  const subjectGroups   = subj.subjectGroups       || []
  const tissueSamples   = subj.tissueSamples       || []
  const tissueCollects  = subj.tissueCollections   || []

  const hasSpecimen = flatSubjects.length || subjectGroups.length ||
                      tissueSamples.length || tissueCollects.length

  if (hasSpecimen) {
    sectionTitle('5. Subjects & Tissue Samples')

    if (flatSubjects.length) {
      subheading(`Subjects (${flatSubjects.length})`)
      flatSubjects.forEach((s, i) => {
        field(`Subject ${i + 1}`,
          [
            s.subjectID,
            s.species   ? `Species: ${s.species}`   : '',
            s.strain    ? `Strain: ${s.strain}`     : '',
            s.bioSex    ? `Sex: ${s.bioSex}`        : '',
            s.age       ? `Age: ${s.age} ${s.ageUnit || ''}` : '',
          ].filter(Boolean).join('  |  ')
        )
      })
    }

    if (subjectGroups.length) {
      subheading(`Subject Groups (${subjectGroups.length})`)
      subjectGroups.forEach((g, i) => {
        field(`Group ${i + 1}`,
          `${g.name || `Group ${i + 1}`} — ${g.subjects?.length || 0} subjects`
        )
      })
    }

    if (tissueSamples.length) {
      subheading(`Tissue Samples (${tissueSamples.length})`)
      tissueSamples.forEach((s, i) => {
        field(`Sample ${i + 1}`,
          [
            s.sampleID,
            s.type      ? `Type: ${s.type}`         : '',
            s.species   ? `Species: ${s.species}`   : '',
          ].filter(Boolean).join('  |  ')
        )
      })
    }

    if (tissueCollects.length) {
      subheading(`Tissue Sample Collections (${tissueCollects.length})`)
      tissueCollects.forEach((c, i) => {
        field(`Collection ${i + 1}`,
          `${c.collectionID || `Collection ${i + 1}`} — ${c.samples?.length || 0} samples`
        )
      })
    }
  }

  // ── footer on all pages ───────────────────────────────────────────────────
  drawFooter()

  // ── save ──────────────────────────────────────────────────────────────────
  const title    = d1.dataTitle || 'metadata'
  const safeName = title.replace(/[^a-z0-9]/gi, '_').slice(0, 40).toLowerCase()
  doc.save(`${safeName}_metadata.pdf`)
}