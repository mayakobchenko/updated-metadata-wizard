// Turns what is stored in the Knowledge Graph for ONE dataset version (the dataset version itself, its parent Dataset,
// and the instances in its collab space) back into the data of the wizard form: the reverse of python_upload_json.py.
// Pure functions: no network, so they can be tested. The fetching is in kgCollabContent.js.
//
// What comes back (the form never loses what a person already entered; see src/components/kgMerge.js):
//   title, short title, summary, licence, embargo, data types, copyright, support channels, home page, related publications,
//   authors and data custodian (name, ORCID), other contributors, experimental approach / techniques / preparation types /
//   study targets, and the subjects with their states (time points).
// Not read back (reported in `notes`): subject groups, tissue samples and tissue sample collections, funding, e-mail
// addresses and affiliations of persons (the KG does not hold them in a form the wizard can use), CRediT roles.

export const V = 'https://openminds.om-i.org/props/'
export const T = 'https://openminds.om-i.org/types/'
export const KG_PREFIX = 'https://kg.ebrains.eu/api/instances/'
export const EMBARGO_ACCESS_ID = '897dc2af-405d-4df3-9152-6d9e5cae55d8'
const UUID_AT_END = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\s*$/i

export const uuidOf = (x) => {
  const raw = typeof x === 'string' ? x : x?.['@id']
  const m = String(raw || '').match(UUID_AT_END)
  return m ? m[1].toLowerCase() : null
}
export const kgUrl = (uuid) => KG_PREFIX + uuid
const asArray = (v) => (v == null ? [] : Array.isArray(v) ? v : [v])
const prop = (inst, name) => inst?.[V + name]
const text = (v) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim())
const refs = (inst, name) => asArray(prop(inst, name)).map(uuidOf).filter(Boolean)
const hasType = (inst, type) => asArray(inst?.['@type']).includes(T + type)

let counter = 0
const newId = () => Date.now() + (counter++ % 1000) / 1000 + Math.random() / 1e6

// ── persons ────────────────────────────────────────────────────────────────────

function orcidOf(person, byId) {
  for (const id of refs(person, 'digitalIdentifier')) {
    const inst = byId[id]
    if (!inst) continue
    if (hasType(inst, 'ORCID') || /orcid\.org/i.test(text(prop(inst, 'identifier')))) {
      const v = text(prop(inst, 'identifier')).replace(/^https?:\/\/orcid\.org\//i, '')
      if (v) return v
    }
  }
  return ''
}

export function personFields(person, byId = {}) {
  if (!person) return null
  const firstName = text(prop(person, 'givenName'))
  const lastName = text(prop(person, 'familyName'))
  if (!firstName && !lastName) return null
  return { firstName, lastName, orcid: orcidOf(person, byId) }
}

// ── subjects ───────────────────────────────────────────────────────────────────

const quantity = (q) => {
  if (!q || typeof q !== 'object') return { value: '', unit: '' }
  const value = prop(q, 'value')
  const unit = uuidOf(prop(q, 'unit'))
  return { value: value == null ? '' : String(value), unit: unit ? kgUrl(unit) : '' }
}

// The upload writes one state per time point and chains them with descendedFrom. Put them back in that order.
export function orderStates(states) {
  const byId = new Map(states.map(s => [uuidOf(s['@id']), s]))
  const first = states.filter(s => !refs(s, 'descendedFrom').some(id => byId.has(id)))
  const out = []
  const seen = new Set()
  const walk = (s) => {
    const id = uuidOf(s['@id'])
    if (seen.has(id)) return
    seen.add(id); out.push(s)
    states.filter(n => refs(n, 'descendedFrom').includes(id)).forEach(walk)
  }
  first.forEach(walk)
  states.forEach(s => { if (!seen.has(uuidOf(s['@id']))) out.push(s) })   // never lose a state, whatever the links look like
  return out
}

export function subjectToForm(subject, byId) {
  const states = orderStates(refs(subject, 'studiedState').map(id => byId[id]).filter(Boolean))
  // the upload writes the strain into the species field when there is one, so the type of the linked term tells which it is
  let strain = ''
  let species = ''
  for (const id of refs(subject, 'species')) {
    const term = byId[id]
    if (term && hasType(term, 'Strain')) {
      strain = kgUrl(id)
      const sp = refs(term, 'species')[0]
      if (sp) species = kgUrl(sp)
    } else species = kgUrl(id)
  }
  const sex = refs(subject, 'biologicalSex')[0]
  const handedness = states.map(s => refs(s, 'handedness')[0]).find(Boolean)
  return {
    id: newId(),
    subjectID: text(prop(subject, 'lookupLabel')) || text(prop(subject, 'internalIdentifier')),
    bioSex: sex ? kgUrl(sex) : '',
    species,
    strain,
    handedness: handedness ? kgUrl(handedness) : '',
    file_path: '',
    linkedSampleIds: [],
    states: (states.length ? states : [null]).map((st) => {
      if (!st) return { id: newId(), ageCategory: '', age: '', ageUnit: '', weight: '', weightUnit: '', disease: [], diseaseModel: [], subjectAttribute: [], additionalRemarks: '', relativeTimeValue: '', relativeTimeUnit: '' }
      const age = quantity(prop(st, 'age'))
      const weight = quantity(prop(st, 'weight'))
      const rel = quantity(prop(st, 'relativeTimeIndication'))
      // one list "pathology" holds diseases and disease models; the type of each term separates them again
      const disease = []
      const diseaseModel = []
      for (const id of refs(st, 'pathology')) {
        if (hasType(byId[id], 'DiseaseModel')) diseaseModel.push(kgUrl(id)); else disease.push(kgUrl(id))
      }
      const cat = refs(st, 'ageCategory')[0]
      return {
        id: newId(),
        ageCategory: cat ? kgUrl(cat) : '',
        age: age.value, ageUnit: age.unit,
        weight: weight.value, weightUnit: weight.unit,
        disease, diseaseModel,
        subjectAttribute: refs(st, 'attribute').map(kgUrl),
        additionalRemarks: text(prop(st, 'additionalRemarks')),
        relativeTimeValue: rel.value, relativeTimeUnit: rel.unit,
      }
    }),
  }
}

// ── the whole dataset version ──────────────────────────────────────────────────

// input: { dsvId, dsv, dataset, byId, subjects }
//   dsv / dataset: the DatasetVersion and its parent Dataset (dataset may be null)
//   byId: every other instance that was read, by uuid (persons, ORCIDs, organisations, DOIs, subject states, terms)
//   subjects: the Subject instances of the collab space
// returns { data, summary: [lines], notes: [lines], counts }
export function buildFormFromKg({ dsvId, dsv, dataset = null, byId = {}, subjects = [], ignored = {} }) {
  const data = { datasetVersionId: dsvId }
  const notes = []

  // dataset1
  const dataset1 = {}
  const title = text(prop(dsv, 'fullName')) || text(prop(dataset, 'fullName'))
  if (title) dataset1.dataTitle = title
  const shortName = text(prop(dsv, 'shortName')) || text(prop(dataset, 'shortName'))
  if (shortName) dataset1.shortTitle = shortName
  const summary = text(prop(dataset, 'description')) || text(prop(dsv, 'description'))
  if (summary) dataset1.briefSummary = summary
  const lic = refs(dsv, 'license')[0]
  if (lic) dataset1.license = kgUrl(lic)
  const access = refs(dsv, 'accessibility')[0]
  if (access) {
    dataset1.embargo = access === EMBARGO_ACCESS_ID
    const rd = text(prop(dsv, 'releaseDate'))
    if (dataset1.embargo && rd) dataset1.embargoDate = rd
  }
  const dataTypes = refs(dsv, 'dataType').map(kgUrl)
  if (dataTypes.length) dataset1.optionsData = dataTypes

  // copyright: an embedded object { holder, year }
  const cr = asArray(prop(dsv, 'copyright'))[0]
  if (cr && typeof cr === 'object') {
    const holderId = refs(cr, 'holder')[0]
    const holder = byId[holderId]
    const year = asArray(prop(cr, 'year'))[0]
    if (holder) {
      dataset1.copyright = 'Yes'
      if (hasType(holder, 'Organization')) {
        dataset1.copyrightHolder = 'Organization'
        dataset1.copyrightOrganization = text(prop(holder, 'fullName')) || text(prop(holder, 'name'))
      } else {
        const p = personFields(holder, byId)
        dataset1.copyrightHolder = 'Person'
        dataset1.copyrightFirstName = p?.firstName || ''
        dataset1.copyrightLastName = p?.lastName || ''
      }
      if (year) dataset1.copyrightYear = `${String(year).slice(0, 4)}-01-01T00:00:00.000Z`
    }
  }
  if (Object.keys(dataset1).length) data.dataset1 = dataset1

  // dataset2: support channels, home page, related publications (DOIs)
  const dataset2 = {}
  const channels = asArray(prop(dsv, 'supportChannel')).map(text).filter(Boolean)
  if (channels.length) dataset2.supportChannels = channels.map(c => ({ id: newId(), newChannel: c }))
  const home = text(prop(dsv, 'homepage'))
  if (home) dataset2.homePage = home
  const pubs = refs(dsv, 'relatedPublication').map(id => text(prop(byId[id], 'identifier'))).filter(Boolean)
  if (pubs.length) dataset2.relatedPublications = pubs.map(p => ({ id: newId(), newPublication: p.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '') }))
  if (Object.keys(dataset2).length) data.dataset2 = dataset2

  // custodian and authors (the Dataset carries both). The custodian is also one of the authors: its place in the
  // list becomes contribution.custodianPosition and it is removed from the plain author list.
  const custodianId = refs(dataset, 'custodian')[0]
  const custodian = personFields(byId[custodianId], byId)
  if (custodian) data.custodian = { firstName: custodian.firstName, familyName: custodian.lastName, orcid: custodian.orcid }
  const contribution = {}
  const authorIds = refs(dataset, 'author')
  const authors = []
  authorIds.forEach((id, i) => {
    if (id === custodianId) { contribution.custodianPosition = i + 1; return }
    const p = personFields(byId[id], byId)
    if (!p) return
    authors.push({ id: newId(), isCustom: true, firstName: p.firstName, lastName: p.lastName, selectedAuthor: '', email: '', affiliationIds: [], contributions: [], orcid: p.orcid })
  })
  if (authors.length) contribution.authors = authors

  // other contributors: embedded Contribution objects { contributor, type[] }
  const others = []
  for (const c of asArray(prop(dsv, 'otherContribution'))) {
    const p = personFields(byId[refs(c, 'contributor')[0]], byId)
    if (!p) continue
    others.push({ id: newId(), isCustom: true, firstName: p.firstName, lastName: p.lastName, orcid: p.orcid, selectedOtherContr: '', contributionTypes: refs(c, 'type').map(kgUrl) })
  }
  if (others.length) contribution.contributor = { othercontr: others }
  if (Object.keys(contribution).length) data.contribution = contribution

  // experiments
  const experiments = {}
  const list = (name) => refs(dsv, name).map(kgUrl)
  if (list('experimentalApproach').length) experiments.experimentalApproach = list('experimentalApproach')
  if (list('technique').length) experiments.techniques = list('technique')
  if (list('preparationDesign').length) experiments.preparationTypes = list('preparationDesign')
  if (list('studyTarget').length) experiments.studyTargets = list('studyTarget')

  // subjects of the collab space
  const subjectForms = subjects.map(s => subjectToForm(s, byId)).filter(s => s.subjectID)
  subjectForms.sort((a, b) => a.subjectID.localeCompare(b.subjectID, undefined, { numeric: true }))
  if (subjectForms.length) {
    data.subjectMetadata = { subjects: subjectForms }
    experiments.subjectschoice = 'Yes'
  }
  if (Object.keys(experiments).length) data.experiments = experiments

  // what was found but not read back
  for (const [label, n] of Object.entries(ignored)) if (n) notes.push(`${n} ${label} found in the collab space; they are not read back into the form`)
  if (authors.length || custodian) notes.push('E-mail addresses and affiliations of persons are not stored in the Knowledge Graph in a form the wizard can read; please check them in the Contributors step')

  const states = subjectForms.reduce((n, s) => n + s.states.length, 0)
  const lines = []
  if (title) lines.push(`Title: ${title}`)
  if (summary) lines.push('Summary')
  if (lic) lines.push('Licence')
  if (cr) lines.push('Copyright')
  if (authors.length || custodian) lines.push(`Authors: ${authors.length}${custodian ? ' + the data custodian' : ''}`)
  if (others.length) lines.push(`Other contributors: ${others.length}`)
  const exp = ['experimentalApproach', 'techniques', 'preparationTypes', 'studyTargets'].reduce((n, k) => n + (experiments[k]?.length || 0), 0)
  if (exp) lines.push(`Experiment terms: ${exp}`)
  if (subjectForms.length) lines.push(`Subjects: ${subjectForms.length} (${states} states)`)
  return { data, summary: lines, notes, counts: { subjects: subjectForms.length, states, authors: authors.length + (custodian ? 1 : 0) } }
}
