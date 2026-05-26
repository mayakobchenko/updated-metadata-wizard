import { buildLookups, resolve } from './metadataLookups'

export async function generateMetadataTxt(formData) {
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

  const lines = []

  const hr    = (char = '═') => lines.push(char.repeat(70))
  const sec   = (title)      => { lines.push(''); hr(); lines.push(`  ${title}`); hr(); lines.push('') }
  const sub   = (title)      => { lines.push(''); lines.push(`  -- ${title}`); lines.push('') }
  const field = (label, val) => { if (val && val !== '') lines.push(`  ${label.padEnd(26)} ${val}`) }

  lines.push('EBRAINS METADATA WIZARD — DATASET SUMMARY')
  lines.push(`Generated: ${new Date().toLocaleString('en-GB')}`)
  hr('─')

  // ── 1. Dataset ────────────────────────────────────────────────────────────
  sec('1. DATASET INFORMATION')
  field('Full title:',         d1.dataTitle)
  field('Short name:',         d1.shortTitle)
  field('License:',            resolve(d1.license, lookups.licenseMap))
  field('Data types:',         resolve(d1.optionsData, lookups.dataTypeMap))
  field('Data standards:',     Array.isArray(d1.dataStandart) ? d1.dataStandart.join(', ') : d1.dataStandart)
  field('Embargo:',            d1.embargo
    ? `Yes${d1.embargoDate ? ` (until ${new Date(d1.embargoDate).toLocaleDateString('en-GB')})` : ''}`
    : 'No')
  field('Homepage:',           d2.homePage || d2.Data2UrlDoiRepo)
  field('Related DOI:',        d2.Data2DoiJournal)
  const pubs = (d2.relatedPublications || []).map(p => p.newPublication).filter(Boolean)
  if (pubs.length) field('Related publications:', pubs.join('; '))
  const channels = (d2.supportChannels || []).map(c => c.newChannel).filter(Boolean)
  if (channels.length) field('Support channels:', channels.join(', '))
  if (d1.briefSummary) {
    lines.push('')
    lines.push('  Description:')
    // wrap at 66 chars
    const words = d1.briefSummary.replace(/\n/g, ' ').split(' ')
    let line = '    '
    words.forEach(w => {
      if ((line + w).length > 68) { lines.push(line.trimEnd()); line = '    ' + w + ' ' }
      else line += w + ' '
    })
    if (line.trim()) lines.push(line.trimEnd())
  }

  // ── 2. People ─────────────────────────────────────────────────────────────
  sec('2. PEOPLE')

  if (cust.firstName || cust.familyName) {
    sub('Custodian')
    field('Name:',        `${cust.firstName || ''} ${cust.familyName || ''}`.trim())
    field('Email:',       cust.email)
    field('ORCID:',       cust.orcid)
    field('Institution:', cust.institution)
  }
  if (cont.firstName || cont.familyName) {
    sub('Contact Person')
    field('Name:',  `${cont.firstName || ''} ${cont.familyName || ''}`.trim())
    field('Email:', cont.email)
  }
  if (gl.name) {
    sub('Group Leader')
    field('Name:',  gl.name)
    if (gl.orcid) field('ORCID:', gl.orcid)
  }

  const authors = contr.authors || []
  if (authors.length) {
    sub('Authors')
    authors.forEach((a, i) => {
      const name = a.selectedAuthor
        ? (resolve(a.selectedAuthor, lookups.contributorMap) || a.selectedAuthor)
        : `${a.firstName || ''} ${a.lastName || ''}`.trim()
      field(`Author ${i + 1}:`, name + (a.orcid ? ` (${a.orcid})` : ''))
    })
  }

  const otherContrs = contr.contributor?.othercontr || []
  if (otherContrs.length) {
    sub('Other Contributors')
    otherContrs.forEach((c, i) => {
      const name = c.selectedOtherContr
        ? (resolve(c.selectedOtherContr, lookups.contributorMap) || c.selectedOtherContr)
        : `${c.firstName || ''} ${c.lastName || ''}`.trim()
      const types = resolve(c.selectedTypeContr || c.contributionTypes || [], lookups.contribTypeMap)
      field(`Contributor ${i + 1}:`, `${name}${types ? ` [${types}]` : ''}`)
    })
  }

  // ── 3. Experiments ────────────────────────────────────────────────────────
  sec('3. EXPERIMENTS')
  field('Experimental approaches:', resolve(exp.experimentalApproach, lookups.approachMap))
  field('Techniques:',              resolve(exp.techniques,            lookups.techniqueMap))
  field('Preparation types:',       resolve(exp.preparationTypes,      lookups.prepTypeMap))
  field('Study targets:',           resolve(exp.studyTargets,          lookups.studyTargetMap))
  if (exp.keywords) field('Keywords:', exp.keywords)

  // ── 4. Funding ────────────────────────────────────────────────────────────
  const funders = fund.funders || []
  if (funders.length) {
    sec('4. FUNDING')
    funders.forEach((f, i) => {
      sub(`Grant ${i + 1}`)
      const funderName = f.selectedFundingId
        ? (resolve(f.selectedFundingId, lookups.funderMap) || f.selectedFundingId)
        : (f.funderName || f.customFunderName || '')
      field('Funder:',       funderName)
      field('Award title:',  f.awardTitle  || f.customAwardTitle)
      field('Award number:', f.awardNumber || f.grantId || f.customAwardNumber)
    })
  }

  // ── 5. Subjects & Tissue Samples ─────────────────────────────────────────
  const flatSubjects   = subj.subjects          || []
  const subjectGroups  = subj.subjectGroups      || []
  const tissueSamples  = subj.tissueSamples      || []
  const tissueCollects = subj.tissueCollections  || []

  const renderSubjectFields = (s, label) => {
    sub(label)
    field('Subject ID:',     s.subjectID)
    field('Species:',        resolve(s.species,      lookups.speciesMap))
    field('Strain:',         resolve(s.strain,       lookups.strainMap))
    field('Biological sex:', resolve(s.bioSex,       lookups.bioSexMap))
    field('Age category:',   resolve(s.ageCategory,  lookups.ageCatMap))
    if (s.age)    field('Age:',    `${s.age}`)
    if (s.weight) field('Weight:', `${s.weight}`)
    field('Handedness:',     resolve(s.handedness,   lookups.handednessMap))
    const diseases = [
      ...((s.disease      || []).map(d => resolve(d, lookups.diseaseMap))),
      ...((s.diseaseModel || []).map(d => resolve(d, lookups.diseaseMap))),
    ].filter(Boolean)
    if (diseases.length) field('Pathology:', diseases.join(', '))
    const attrs = (s.subjectAttribute || []).map(a => resolve(a, lookups.subjectAttrMap)).filter(Boolean)
    if (attrs.length) field('Attributes:', attrs.join(', '))
    if (s.additionalRemarks) field('Remarks:', s.additionalRemarks)
  }

  const renderTissueFields = (s, label) => {
    sub(label)
    field('Sample ID:',      s.sampleID)
    field('Type:',           resolve(s.type,         lookups.tissueSampleTypeMap))
    field('Species:',        resolve(s.species,      lookups.speciesMap))
    field('Strain:',         resolve(s.strain,       lookups.strainMap))
    field('Biological sex:', resolve(s.biologicalSex,lookups.bioSexMap))
    field('Laterality:',     resolve(s.laterality,   lookups.lateralityMap))
    field('Origin:',         resolve(s.origin,       lookups.organMap))
    if (s.age)    field('Age:',    `${s.age}`)
    if (s.weight) field('Weight:', `${s.weight}`)
    const pathology = (s.pathology || []).map(p => resolve(p, lookups.diseaseMap)).filter(Boolean)
    if (pathology.length) field('Pathology:', pathology.join(', '))
    const attrs = (s.tissueSampleAttribute || []).map(a => resolve(a, lookups.tissueAttrMap)).filter(Boolean)
    if (attrs.length) field('Attributes:', attrs.join(', '))
    if (s.additionalRemarks) field('Remarks:', s.additionalRemarks)
  }

  if (flatSubjects.length || subjectGroups.length || tissueSamples.length || tissueCollects.length) {
    sec('5. SUBJECTS & TISSUE SAMPLES')

    flatSubjects.forEach((s, i) => renderSubjectFields(s, `Subject ${i + 1}`))

    subjectGroups.forEach((g, gi) => {
      sub(`Group ${gi + 1}: ${g.name || ''}  (${g.subjects?.length || 0} subjects)`)
      if (g.additionalRemarks) field('Group remarks:', g.additionalRemarks)
      ;(g.subjects || []).forEach((s, si) =>
        renderSubjectFields(s, `Subject ${si + 1} of group ${gi + 1}`)
      )
    })

    tissueSamples.forEach((s, i) => renderTissueFields(s, `Tissue Sample ${i + 1}`))

    tissueCollects.forEach((c, ci) => {
      sub(`Collection ${ci + 1}: ${c.collectionID || ''}  (${c.samples?.length || 0} samples)`)
      if (c.additionalRemarks) field('Collection remarks:', c.additionalRemarks)
      ;(c.samples || []).forEach((s, si) =>
        renderTissueFields(s, `Sample ${si + 1} of collection ${ci + 1}`)
      )
    })
  }

  hr()
  lines.push('End of summary — EBRAINS Metadata Wizard')
  hr()

  const text = lines.join('\n')
  const blob = new Blob([text], { type: 'text/plain; charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  const safe = (d1.dataTitle || 'metadata').replace(/[^a-z0-9]/gi, '_').slice(0, 40).toLowerCase()
  a.href     = url
  a.download = `${safe}_metadata.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}