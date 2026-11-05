import { authorProblems, isEmail } from './authorModel'

// Everything the wizard marks as mandatory, checked on the data (not on the screen), so it works for all steps at
// once - also for steps the person never opened, or data that came from a loaded draft.
// Returns [{ step: <step index>, title: 'Dataset', items: ['Dataset title', ...] }] - empty when all is complete.
const t = (v) => String(v ?? '').trim()
const TITLE_MAX = 110

export const STEP = { dataset: 0, funding: 1, contributors: 2, experiments: 3, subjects: 4 }

export function missingRequired(data = {}, { subjectsDone = true } = {}) {
  const out = []
  const add = (step, title, items) => { if (items.length) out.push({ step, title, items }) }

  // ── Dataset ──
  const d = data.dataset1 || {}
  const ds = []
  if (!t(d.dataTitle)) ds.push('Dataset title')
  else if (d.dataTitle.length > TITLE_MAX || /[:()]/.test(d.dataTitle)) ds.push(`Dataset title (at most ${TITLE_MAX} characters, no colons or parentheses)`)
  if (!t(d.shortTitle)) ds.push('Short title')
  if (!(d.optionsData || []).length) ds.push('Type of data you would like to share')
  if (!d.copyright) ds.push('Is this version of the dataset copyrighted? (yes or no)')
  else if (d.copyright === 'Yes') {
    const holder = d.copyrightHolder || 'Person'
    if (holder === 'Organization') { if (!t(d.copyrightOrganization)) ds.push('Copyright holder: organization name') }
    else {
      if (!t(d.copyrightFirstName)) ds.push('Copyright holder: first name')
      if (!t(d.copyrightLastName)) ds.push('Copyright holder: last name')
    }
    if (!d.copyrightYear) ds.push('Copyright year')
  }
  if (!t(d.license)) ds.push('License')
  add(STEP.dataset, 'Dataset', ds)

  // ── Funding ──
  const f = data.funding || {}
  const answer = f.isFunded || ((f.funders || []).length ? 'Yes' : '')
  const fs = []
  if (!answer) fs.push('Was the work behind this dataset funded? (yes or no)')
  else if (answer === 'Yes') {
    const funders = f.funders || []
    if (!funders.length) fs.push('At least one funder')
    funders.forEach((x, i) => {
      if (!t(x.funderName)) fs.push(`Funder ${i + 1}: name`)
    })
  }
  add(STEP.funding, 'Funding', fs)

  // ── Contributors: contact person, data custodian, authors ──
  const cs = []
  const person = (label, p = {}, affKey) => {
    if (!t(p.firstName)) cs.push(`${label}: first name`)
    if (!t(p.familyName)) cs.push(`${label}: family name`)
    if (!t(p.email)) cs.push(`${label}: email`)
    else if (!isEmail(p.email)) cs.push(`${label}: a valid email address`)
    if (!t(p[affKey])) cs.push(`${label}: affiliation`)
  }
  person('Contact person', data.contactperson, 'affiliation')
  person('Data custodian', data.custodian, 'institution')
  authorProblems(data).forEach((line) => cs.push(line.replace(/: please give /, ': ').replace(/\.$/, '')))
  add(STEP.contributors, 'Contributors', cs)

  // ── Experiments ──
  const e = data.experiments || {}
  const es = []
  if (!e.subjectschoice) es.push('Did you use experimental subjects? (yes or no)')
  if (!(e.experimentalApproach || []).length) es.push('Experimental approach')
  if (!(e.techniques || []).length) es.push('Experimental techniques')
  if (!(e.preparationTypes || []).length) es.push('Preparation type')
  if (!(e.studyTargets || []).length) es.push('Study targets')
  add(STEP.experiments, 'Experiments', es)

  // ── Subjects: checked by the step itself when it is left with Next ──
  if (e.subjectschoice === 'Yes' && !subjectsDone) {
    add(STEP.subjects, 'Subjects', ['Please open this step, check the subjects, tissue samples and units, and click Next'])
  }
  return out
}
