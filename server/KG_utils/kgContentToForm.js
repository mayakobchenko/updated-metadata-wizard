// Turns what is stored in the Knowledge Graph for ONE dataset version (the dataset version itself, its parent Dataset,
// and the instances in its collab space) back into the data of the wizard form: the reverse of python_upload_json.py.
// Pure functions: no network, so they can be tested. The fetching is in kgCollabContent.js.
//
// What comes back (the form never loses what a person already entered; see src/components/kgMerge.js):
//   title, short title, summary, licence, embargo, data types, copyright, support channels, home page, related publications,
//   authors and data custodian (name, ORCID), other contributors, experimental approach / techniques / preparation types /
//   study targets, the subjects with their states (time points), subject groups, tissue samples and tissue sample collections
//   (with the links to the subject and the time point they were taken from).
// Not read back: funding, e-mail addresses and affiliations of persons (the KG does not hold them in a form the wizard can
// use), CRediT roles.

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

// the upload writes the strain into the species field when there is one, so the type of the linked term tells which it is
function speciesAndStrain(node, byId) {
  let strain = ''
  let species = ''
  for (const id of refs(node, 'species')) {
    const term = byId[id]
    if (term && hasType(term, 'Strain')) {
      strain = kgUrl(id)
      const sp = refs(term, 'species')[0]
      if (sp) species = kgUrl(sp)
    } else species = kgUrl(id)
  }
  return { species, strain }
}

const first = (inst, name) => { const r = refs(inst, name)[0]; return r ? kgUrl(r) : '' }

// A subject with its states; `stateUuids` are the KG ids of the states in the same order as form.states
export function subjectWithStateIds(subject, byId) {
  const states = orderStates(refs(subject, 'studiedState').map(id => byId[id]).filter(Boolean))
  const { species, strain } = speciesAndStrain(subject, byId)
  const sex = refs(subject, 'biologicalSex')[0]
  const handedness = states.map(s => refs(s, 'handedness')[0]).find(Boolean)
  const form = {
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
  return { form, stateUuids: states.map(st => uuidOf(st['@id'])) }
}

export const subjectToForm = (subject, byId) => subjectWithStateIds(subject, byId).form

// ── subject groups, tissue samples, tissue sample collections ──────────────────────

const range = (r) => {
  if (!r || typeof r !== 'object') return { min: '', minUnit: '', max: '', maxUnit: '' }
  const unit = (n) => { const u = uuidOf(prop(r, n)); return u ? kgUrl(u) : '' }
  const num = (n) => (prop(r, n) == null ? '' : String(prop(r, n)))
  return { min: num('minValue'), minUnit: unit('minValueUnit'), max: num('maxValue'), maxUnit: unit('maxValueUnit') }
}

export function groupToForm(group, memberForms, byId) {
  const st = byId[refs(group, 'studiedState')[0]]
  const age = range(asArray(prop(st, 'age'))[0])
  const h = first(st, 'handedness')
  return {
    id: newId(),
    name: text(prop(group, 'lookupLabel')) || text(prop(group, 'internalIdentifier')),
    additionalRemarks: text(prop(group, 'additionalRemarks')),
    groupState: {
      ageCategory: refs(st, 'ageCategory').map(kgUrl),
      attribute: refs(st, 'attribute').map(kgUrl),
      handedness: h ? [h] : [],
      pathology: refs(st, 'pathology').map(kgUrl),
      ageMin: age.min, ageMinUnit: age.minUnit, ageMax: age.max, ageMaxUnit: age.maxUnit,
    },
    subjects: memberForms,
  }
}

// subjectStateIndex: KG id of a subject state -> { subjectId, stateId } of the form (the link of a sample to the
// subject and time point it was taken from is the first sample state's descendedFrom)
export function sampleToForm(sample, byId, subjectStateIndex = new Map(), { linked = true } = {}) {
  const states = orderStates(refs(sample, 'studiedState').map(id => byId[id]).filter(Boolean))
  const { species, strain } = speciesAndStrain(sample, byId)
  const origin = states.length ? refs(states[0], 'descendedFrom').map(id => subjectStateIndex.get(id)).find(Boolean) : null
  return {
    id: newId(),
    sampleID: text(prop(sample, 'lookupLabel')) || text(prop(sample, 'internalIdentifier')),
    type: first(sample, 'type'),
    species, strain,
    biologicalSex: first(sample, 'biologicalSex'),
    laterality: first(sample, 'laterality'),
    origin: first(sample, 'origin'),
    pathology: states.length ? refs(states[0], 'pathology').map(kgUrl) : [],     // a sample-level value, written on every state
    linkedSubjectId: linked && origin ? origin.subjectId : null,
    linkedSubjectStateId: linked && origin ? origin.stateId : null,
    states: (states.length ? states : [null]).map((st) => {
      const age = quantity(st && prop(st, 'age'))
      const weight = quantity(st && prop(st, 'weight'))
      const rel = quantity(st && prop(st, 'relativeTimeIndication'))
      return {
        id: newId(),
        age: age.value, ageUnit: age.unit, weight: weight.value, weightUnit: weight.unit,
        tissueSampleAttribute: st ? refs(st, 'attribute').map(kgUrl) : [],
        additionalRemarks: st ? text(prop(st, 'additionalRemarks')) : '',
        relativeTimeValue: rel.value, relativeTimeUnit: rel.unit,
      }
    }),
  }
}

export function collectionToForm(collection, memberForms, byId, subjectStateIndex = new Map()) {
  const st = byId[refs(collection, 'studiedState')[0]]
  const age = range(asArray(prop(st, 'age'))[0])
  const origin = st ? refs(st, 'descendedFrom').map(id => subjectStateIndex.get(id)).find(Boolean) : null
  return {
    id: newId(),
    collectionID: text(prop(collection, 'lookupLabel')) || text(prop(collection, 'internalIdentifier')),
    additionalRemarks: text(prop(collection, 'additionalRemarks')),
    linkedSubjectId: origin ? origin.subjectId : null,
    linkedSubjectStateId: origin ? origin.stateId : null,
    collectionState: {
      attribute: st ? refs(st, 'attribute').map(kgUrl) : [],
      ageMin: age.min, ageMinUnit: age.minUnit, ageMax: age.max, ageMaxUnit: age.maxUnit,
    },
    samples: memberForms,
  }
}

// ── the whole dataset version ──────────────────────────────────────────────────

// input: { dsvId, dsv, dataset, byId, subjects }
//   dsv / dataset: the DatasetVersion and its parent Dataset (dataset may be null)
//   byId: every other instance that was read, by uuid (persons, ORCIDs, organisations, DOIs, subject states, terms)
//   subjects: the Subject instances of the collab space
// returns { data, summary: [lines], notes: [lines], counts }
export function buildFormFromKg({ dsvId, dsv, dataset = null, byId = {}, subjects = [], groups = [], samples = [], collections = [], ignored = {} }) {
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

  // subjects, groups, tissue samples and collections of the collab space
  const byLabel = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true })
  const subjectStateIndex = new Map()
  const groupIds = new Set(groups.map(g => uuidOf(g['@id'])))
  const flatSubjects = []
  const membersOf = new Map()
  for (const inst of subjects) {
    const { form, stateUuids } = subjectWithStateIds(inst, byId)
    if (!form.subjectID) continue
    stateUuids.forEach((u, i) => subjectStateIndex.set(u, { subjectId: form.id, stateId: form.states[i].id }))
    const g = refs(inst, 'isPartOf').find(id => groupIds.has(id))
    if (g) { if (!membersOf.has(g)) membersOf.set(g, []); membersOf.get(g).push(form) } else flatSubjects.push(form)
  }
  flatSubjects.sort((a, b) => byLabel(a.subjectID, b.subjectID))
  const groupForms = groups.map(g => groupToForm(g, (membersOf.get(uuidOf(g['@id'])) || []).sort((a, b) => byLabel(a.subjectID, b.subjectID)), byId))
    .filter(g => g.name).sort((a, b) => byLabel(a.name, b.name))

  const collectionIds = new Set(collections.map(c => uuidOf(c['@id'])))
  const flatSamples = []
  const samplesOf = new Map()
  for (const inst of samples) {
    const c = refs(inst, 'isPartOf').find(id => collectionIds.has(id))
    const form = sampleToForm(inst, byId, subjectStateIndex, { linked: !c })     // a collection's samples are linked through the collection
    if (!form.sampleID) continue
    if (c) { if (!samplesOf.has(c)) samplesOf.set(c, []); samplesOf.get(c).push(form) } else flatSamples.push(form)
  }
  flatSamples.sort((a, b) => byLabel(a.sampleID, b.sampleID))
  const collectionForms = collections.map(c => collectionToForm(c, (samplesOf.get(uuidOf(c['@id'])) || []).sort((a, b) => byLabel(a.sampleID, b.sampleID)), byId, subjectStateIndex))
    .filter(c => c.collectionID).sort((a, b) => byLabel(a.collectionID, b.collectionID))

  // a subject lists the flat samples taken from it (the form keeps both sides of the link)
  for (const sm of flatSamples) {
    const owner = flatSubjects.find(s => s.id === sm.linkedSubjectId) || groupForms.flatMap(g => g.subjects).find(s => s.id === sm.linkedSubjectId)
    if (owner) owner.linkedSampleIds.push(sm.id)
  }

  const subjectMetadata = {}
  if (flatSubjects.length) subjectMetadata.subjects = flatSubjects
  if (groupForms.length) subjectMetadata.subjectGroups = groupForms
  if (flatSamples.length) subjectMetadata.tissueSamples = flatSamples
  if (collectionForms.length) subjectMetadata.tissueCollections = collectionForms
  if (Object.keys(subjectMetadata).length) {
    data.subjectMetadata = subjectMetadata
    experiments.subjectschoice = 'Yes'
  }
  if (Object.keys(experiments).length) data.experiments = experiments

  // what was found but not read back
  for (const [label, n] of Object.entries(ignored)) if (n) notes.push(`${n} ${label} found in the collab space; they are not read back into the form`)
  if (authors.length || custodian) notes.push('E-mail addresses and affiliations of persons are not stored in the Knowledge Graph in a form the wizard can read; please check them in the Contributors step')

  const allSubjects = [...flatSubjects, ...groupForms.flatMap(g => g.subjects)]
  const states = allSubjects.reduce((n, x) => n + x.states.length, 0)
  const nSamples = flatSamples.length + collectionForms.reduce((n, c) => n + c.samples.length, 0)
  const lines = []
  if (title) lines.push(`Title: ${title}`)
  if (summary) lines.push('Summary')
  if (lic) lines.push('Licence')
  if (cr) lines.push('Copyright')
  if (authors.length || custodian) lines.push(`Authors: ${authors.length}${custodian ? ' + the data custodian' : ''}`)
  if (others.length) lines.push(`Other contributors: ${others.length}`)
  const exp = ['experimentalApproach', 'techniques', 'preparationTypes', 'studyTargets'].reduce((n, k) => n + (experiments[k]?.length || 0), 0)
  if (exp) lines.push(`Experiment terms: ${exp}`)
  if (allSubjects.length) lines.push(`Subjects: ${allSubjects.length} (${states} states)`)
  if (groupForms.length) lines.push(`Subject groups: ${groupForms.length}`)
  if (nSamples) lines.push(`Tissue samples: ${nSamples}`)
  if (collectionForms.length) lines.push(`Tissue sample collections: ${collectionForms.length}`)
  return { data, summary: lines, notes, counts: { subjects: allSubjects.length, states, authors: authors.length + (custodian ? 1 : 0), groups: groupForms.length, tissueSamples: nSamples, collections: collectionForms.length } }
}
