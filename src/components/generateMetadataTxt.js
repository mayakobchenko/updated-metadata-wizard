// ── generateMetadataTxt.js ────────────────────────────────────────────────────
import { buildLookups, resolve } from './metadataLookups'

export async function generateMetadataTxt(formData) {
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

  const lines = []

  const hr    = (char = '═') => lines.push(char.repeat(70))
  const sec   = (title)       => { lines.push(''); hr(); lines.push(`  ${title}`); hr(); lines.push('') }
  const sub   = (title)       => { lines.push(''); lines.push(`  ── ${title}`); lines.push('') }
  const field = (label, val)  => { if (val && val !== '(unknown)') lines.push(`  ${label.padEnd(24)} ${val}`) }

  lines.push('EBRAINS METADATA WIZARD — DATASET SUMMARY')
  lines.push(`Generated: ${new Date().toLocaleString('en-GB')}`)
  hr('─')

  sec('1. DATASET INFORMATION')
  field('Full title:',      d1.dataTitle)
  field('Short name:',      d1.shortTitle)
  field('License:',         resolve(d1.license, lookups.licenseMap))
  field('Data types:',      resolve(d1.optionsData, lookups.dataTypeMap))
  field('Data standards:',  Array.isArray(d1.dataStandart) ? d1.dataStandart.join(', ') : d1.dataStandart)
  field('Embargo:',         d1.embargo ? `Yes${d1.embargoDate ? ` (until ${new Date(d1.embargoDate).toLocaleDateString('en-GB')})` : ''}` : 'No')
  field('Homepage:',        d2.homePage || d2.Data2UrlDoiRepo)
  field('Related DOI:',     d2.Data2DoiJournal)
  if (d1.briefSummary) {
    lines.push('')
    lines.push('  Description:')
    d1.briefSummary.match(/.{1,66}/g)?.forEach(l => lines.push(`    ${l}`))
  }

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
    field('ORCID:', gl.orcid)
  }

  const authors = contr.authors || []
  if (authors.length) {
    sub('Authors')
    authors.forEach((a, i) => {
      const name = a.selectedAuthor
        ? (lookups.contributorMap.get(a.selectedAuthor) || a.selectedAuthor)
        : `${a.firstName || ''} ${a.lastName || ''}`.trim()
      field(`Author ${i + 1}:`, name + (a.orcid ? ` (${a.orcid})` : ''))
    })
  }

  const otherContrs = contr.contributor?.othercontr || []
  if (otherContrs.length) {
    sub('Other Contributors')
    otherContrs.forEach((c, i) => {
      const name = c.selectedOtherContr
        ? (lookups.contributorMap.get(c.selectedOtherContr) || c.selectedOtherContr)
        : `${c.firstName || ''} ${c.lastName || ''}`.trim()
      const types = resolve(c.selectedTypeContr || c.contributionTypes || [], lookups.contribTypeMap)
      field(`Contributor ${i + 1}:`, `${name}${types && types !== '(unknown)' ? ` [${types}]` : ''}`)
    })
  }

  sec('3. EXPERIMENTS')
  field('Experimental approaches:', resolve(exp.experimentalApproach, lookups.approachMap))
  field('Techniques:',              resolve(exp.techniques,            lookups.techniqueMap))
  field('Preparation types:',       resolve(exp.preparationTypes,      lookups.prepTypeMap))
  field('Study targets:',           resolve(exp.studyTargets,          lookups.studyTargetMap))

  const funders = fund.funders || []
  if (funders.length) {
    sec('4. FUNDING')
    funders.forEach((f, i) => {
      sub(`Grant ${i + 1}`)
      const funderName = f.selectedFundingId
        ? (lookups.funderMap.get(f.selectedFundingId) || f.selectedFundingId)
        : (f.funderName || f.customFunderName || '')
      field('Funder:',       funderName)
      field('Award title:',  f.awardTitle  || f.customAwardTitle)
      field('Award number:', f.awardNumber || f.customAwardNumber)
    })
  }

  const flatSubjects   = subj.subjects         || []
  const subjectGroups  = subj.subjectGroups     || []
  const tissueSamples  = subj.tissueSamples     || []
  const tissueCollects = subj.tissueCollections || []
  if (flatSubjects.length || subjectGroups.length || tissueSamples.length || tissueCollects.length) {
    sec('5. SUBJECTS & TISSUE SAMPLES')
    if (flatSubjects.length) {
      sub(`Subjects (${flatSubjects.length})`)
      flatSubjects.forEach((s, i) =>
        field(`Subject ${i + 1}:`,
          [s.subjectID, s.species && `Species: ${s.species}`, s.strain && `Strain: ${s.strain}`,
           s.bioSex && `Sex: ${s.bioSex}`, s.age && `Age: ${s.age}`].filter(Boolean).join(' | ')
        )
      )
    }
    if (subjectGroups.length) {
      sub(`Subject Groups (${subjectGroups.length})`)
      subjectGroups.forEach((g, i) =>
        field(`Group ${i + 1}:`, `${g.name || `Group ${i + 1}`} — ${g.subjects?.length || 0} subjects`)
      )
    }
    if (tissueSamples.length) {
      sub(`Tissue Samples (${tissueSamples.length})`)
      tissueSamples.forEach((s, i) =>
        field(`Sample ${i + 1}:`,
          [s.sampleID, s.type && `Type: ${s.type}`, s.species && `Species: ${s.species}`].filter(Boolean).join(' | ')
        )
      )
    }
  }

  hr()
  lines.push('End of summary — EBRAINS Metadata Wizard')
  hr()

  const text  = lines.join('\n')
  const blob  = new Blob([text], { type: 'text/plain; charset=utf-8' })
  const url   = URL.createObjectURL(blob)
  const a     = document.createElement('a')
  const safe  = (d1.dataTitle || 'metadata').replace(/[^a-z0-9]/gi, '_').slice(0, 40).toLowerCase()
  a.href      = url
  a.download  = `${safe}_metadata.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}