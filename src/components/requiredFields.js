import { authorProblems, isEmail } from './authorModel.js'

// Everything the wizard marks as mandatory, checked on the data (not on the screen), so it works for all steps at
// once - also for steps the person never opened, or data that came from a loaded draft.
// Returns [{ step: <step index>, title: 'Dataset', items: ['Dataset title', ...] }] - empty when all is complete.
const t = (v) => String(v ?? '').trim()
const TITLE_MAX = 110

export const STEP = { dataset: 0, funding: 1, contributors: 2, experiments: 3, subjects: 4 }

// What the Subjects step checks when it is left with Next, checked on the data: so a draft that is already complete
// does not have to be walked through again. Returns the list of problems (empty = complete).
export function subjectProblems(sm = {}) {
  const groups = sm.subjectGroups || []
  const subjects = [...(sm.subjects || []), ...groups.flatMap(g => g.subjects || [])]
  const states = subjects.flatMap(x => x.states || [])
  const collections = sm.tissueCollections || []
  const samples = [...(sm.tissueSamples || []), ...collections.flatMap(c => c.samples || [])]
  const sampleStates = samples.flatMap(x => x.states || [])
  const subjectById = new Map(subjects.map(x => [x.id, x]))
  const linkIncomplete = (item) => {
    if (!item.linkedSubjectId) return true
    const sub = subjectById.get(item.linkedSubjectId)
    return !!(sub && (sub.states || []).length > 1 && !item.linkedSubjectStateId)
  }
  const n = (arr, f) => arr.filter(f).length
  const out = []
  if (!subjects.length && !samples.length) out.push('no subjects or tissue samples entered')
  const add = (count, text) => { if (count > 0) out.push(`${count} ${text}`) }
  add(n(subjects, x => !x.species), 'subject(s) without a species')
  add(n(states, x => !x.ageCategory), 'subject state(s) without an age category')
  add(n(states, x => !(x.subjectAttribute || []).length), 'subject state(s) without an attribute')
  add(n(samples, x => !x.type), 'tissue sample(s) without a type')
  add(n(samples, x => !x.origin), 'tissue sample(s) without an origin')
  add(n(sampleStates, x => !(x.tissueSampleAttribute || []).length), 'tissue sample state(s) without an attribute')
  if (subjects.length) add(n([...(sm.tissueSamples || []), ...collections], linkIncomplete), 'tissue sample or collection(s) not linked to a subject')
  return out
}

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

  // ── Subjects: the same checks as the step, on the data; the step still has to be opened when something is missing ──
  if (e.subjectschoice === 'Yes' && !subjectsDone) {
    const problems = subjectProblems(data.subjectMetadata)
    if (problems.length) add(STEP.subjects, 'Subjects', [`Please open this step and complete it: ${problems.join('; ')}`])
  }
  return out
}
