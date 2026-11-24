import test from 'node:test'
import assert from 'node:assert/strict'
import { buildFormFromKg, orderStates } from '../server/KG_utils/kgContentToForm.js'

const V = 'https://openminds.om-i.org/props/'
const T = 'https://openminds.om-i.org/types/'
const KG = 'https://kg.ebrains.eu/api/instances/'
const id = (n) => `${n.toString(16).padStart(8, '0')}-0000-4000-8000-000000000000`
const ref = (n) => ({ '@id': KG + id(n) })
const inst = (n, type, props = {}) => ({ '@id': KG + id(n), '@type': [T + type], ...Object.fromEntries(Object.entries(props).map(([k, v]) => [V + k, v])) })
const q = (value, unit) => ({ '@type': [T + 'QuantitativeValue'], [V + 'value']: value, [V + 'unit']: ref(unit) })

const byId = {}
const put = (i) => { byId[i['@id'].split('/').pop()] = i; return i }
put(inst(1, 'Person', { givenName: 'Christian', familyName: 'Vanhove', digitalIdentifier: [ref(2)] }))
put(inst(2, 'ORCID', { identifier: 'https://orcid.org/0000-0002-3988-5980' }))
put(inst(3, 'Person', { givenName: 'Melissa', familyName: 'Lajtos' }))
put(inst(4, 'Organization', { fullName: 'Ghent University' }))
put(inst(5, 'DOI', { identifier: 'https://doi.org/10.1000/xyz' }))
put(inst(6, 'Strain', { species: ref(7) }))
put(inst(7, 'Species', {}))
put(inst(8, 'DiseaseModel', {}))
put(inst(9, 'Disease', {}))
// subject sub-035 with two states, the second descended from the first (stored in the "wrong" order on purpose)
const s2 = put(inst(21, 'SubjectState', { lookupLabel: 'sub-035_state2', descendedFrom: ref(20), age: q(29.7, 30), pathology: [ref(8), ref(9)], relativeTimeIndication: q(82, 31), additionalRemarks: 'note' }))
const s1 = put(inst(20, 'SubjectState', { lookupLabel: 'sub-035_state1', age: q(18, 30), ageCategory: ref(32), attribute: [ref(33)], handedness: ref(34) }))
const subject = inst(22, 'Subject', { lookupLabel: 'sub-035', studiedState: [ref(21), ref(20)], biologicalSex: ref(40), species: ref(6) })

const dsv = inst(100, 'DatasetVersion', {
  fullName: 'Test-retest PET', shortName: 'short', license: ref(50), accessibility: ref(0x897dc2af), dataType: [ref(51)],
  technique: [ref(52)], experimentalApproach: [ref(53)], preparationDesign: [ref(54)], studyTarget: [ref(55), ref(56)],
  supportChannel: ['a@b.no'], relatedPublication: [ref(5)], releaseDate: '2027-03-01',
  copyright: { '@type': [T + 'Copyright'], [V + 'holder']: ref(4), [V + 'year']: ['2026'] },
  otherContribution: [{ '@type': [T + 'Contribution'], [V + 'contributor']: ref(3), [V + 'type']: [ref(57)] }],
})
const dataset = inst(101, 'Dataset', { description: 'A summary', author: [ref(3), ref(1)], custodian: ref(1) })

test('dataset version, dataset, persons and copyright become form data', () => {
  const { data, counts } = buildFormFromKg({ dsvId: id(100), dsv, dataset, byId, subjects: [subject] })
  assert.equal(data.datasetVersionId, id(100))
  assert.equal(data.dataset1.dataTitle, 'Test-retest PET')
  assert.equal(data.dataset1.briefSummary, 'A summary')
  assert.equal(data.dataset1.license, KG + id(50))
  assert.deepEqual(data.dataset1.optionsData, [KG + id(51)])
  assert.equal(data.dataset1.copyright, 'Yes')
  assert.equal(data.dataset1.copyrightHolder, 'Organization')
  assert.equal(data.dataset1.copyrightOrganization, 'Ghent University')
  assert.match(data.dataset1.copyrightYear, /^2026-/)
  assert.equal(data.dataset1.embargo, false)                    // id(0x897dc2af) is not the embargo access id
  assert.deepEqual(data.dataset2.relatedPublications.map(p => p.newPublication), ['10.1000/xyz'])
  assert.deepEqual(data.dataset2.supportChannels.map(c => c.newChannel), ['a@b.no'])
  assert.deepEqual(data.custodian, { firstName: 'Christian', familyName: 'Vanhove', orcid: '0000-0002-3988-5980' })
  // the custodian is the 2nd author: position 2, and not repeated in the plain author list
  assert.equal(data.contribution.custodianPosition, 2)
  assert.deepEqual(data.contribution.authors.map(a => a.lastName), ['Lajtos'])
  assert.equal(data.contribution.contributor.othercontr[0].lastName, 'Lajtos')
  assert.deepEqual(data.contribution.contributor.othercontr[0].contributionTypes, [KG + id(57)])
  assert.deepEqual(data.experiments.studyTargets, [KG + id(55), KG + id(56)])
  assert.equal(data.experiments.subjectschoice, 'Yes')
  assert.deepEqual(counts, { subjects: 1, states: 2, authors: 2 })
})

test('embargo access and release date', () => {
  const emb = { ...dsv, [V + 'accessibility']: { '@id': KG + '897dc2af-405d-4df3-9152-6d9e5cae55d8' } }
  const { data } = buildFormFromKg({ dsvId: id(100), dsv: emb, dataset, byId, subjects: [] })
  assert.equal(data.dataset1.embargo, true)
  assert.equal(data.dataset1.embargoDate, '2027-03-01')
})

test('a subject: states in time order, quantities, strain, diseases and models separated', () => {
  const { data } = buildFormFromKg({ dsvId: id(100), dsv, dataset, byId, subjects: [subject] })
  const s = data.subjectMetadata.subjects[0]
  assert.equal(s.subjectID, 'sub-035')
  assert.equal(s.bioSex, KG + id(40))
  assert.equal(s.strain, KG + id(6))
  assert.equal(s.species, KG + id(7))                           // taken from the strain
  assert.equal(s.handedness, KG + id(34))                       // from the first state, as a subject-level value
  assert.deepEqual(s.states.map(x => x.age), ['18', '29.7'])
  assert.equal(s.states[0].ageUnit, KG + id(30))
  assert.equal(s.states[0].ageCategory, KG + id(32))
  assert.deepEqual(s.states[0].subjectAttribute, [KG + id(33)])
  assert.deepEqual(s.states[1].diseaseModel, [KG + id(8)])
  assert.deepEqual(s.states[1].disease, [KG + id(9)])
  assert.equal(s.states[1].relativeTimeValue, '82')
  assert.equal(s.states[1].additionalRemarks, 'note')
})

test('states are never lost, whatever the links look like', () => {
  const a = inst(1, 'SubjectState', { descendedFrom: ref(2) })
  const b = inst(2, 'SubjectState', { descendedFrom: ref(1) })    // a loop
  assert.equal(orderStates([a, b]).length, 2)
})

test('empty collab space: nothing but the id, and no subjects choice', () => {
  const { data } = buildFormFromKg({ dsvId: id(100), dsv: inst(100, 'DatasetVersion', {}), dataset: null, byId: {}, subjects: [] })
  assert.deepEqual(data, { datasetVersionId: id(100) })
})

test('what is not read back is reported', () => {
  const { notes } = buildFormFromKg({ dsvId: id(100), dsv, dataset, byId, subjects: [], ignored: { 'tissue samples': 4, 'subject groups': 0 } })
  assert.ok(notes.some(n => /4 tissue samples/.test(n)))
  assert.ok(!notes.some(n => /subject groups/.test(n)))
})
