import test from 'node:test'
import assert from 'node:assert/strict'
import { buildFormFromKg, orderStates, uuidOf } from '../server/KG_utils/kgContentToForm.js'

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
  assert.deepEqual(counts, { subjects: 1, states: 2, authors: 2, groups: 0, tissueSamples: 0, collections: 0 })
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
  const { notes } = buildFormFromKg({ dsvId: id(100), dsv, dataset, byId, subjects: [], ignored: { 'funding entries': 4, 'other things': 0 } })
  assert.ok(notes.some(n => /4 funding entries/.test(n)))
  assert.ok(!notes.some(n => /other things/.test(n)))
})

// ── groups, tissue samples, collections ───────────────────────────────────────────
const range = (min, max, unit) => ({ '@type': [T + 'QuantitativeValueRange'], [V + 'minValue']: min, [V + 'minValueUnit']: ref(unit), [V + 'maxValue']: max, [V + 'maxValueUnit']: ref(unit) })

test('a subject group with its group state; its members are not repeated as plain subjects', () => {
  const local = {}
  const put2 = (i) => { local[uuidOf(i['@id'])] = i; return i }
  const gs = put2(inst(60, 'SubjectGroupState', { ageCategory: [ref(32)], attribute: [ref(33)], pathology: [ref(9)], handedness: ref(34), age: range(59, 92, 30) }))
  const group = inst(61, 'SubjectGroup', { lookupLabel: 'Patients', studiedState: [ref(60)], additionalRemarks: 'grp' })
  const member = inst(62, 'Subject', { lookupLabel: 'p-1', isPartOf: ref(61), studiedState: [ref(63)] })
  put2(inst(63, 'SubjectState', { lookupLabel: 'p-1_state1' }))
  const loose = inst(64, 'Subject', { lookupLabel: 'free', studiedState: [] })
  const { data, counts } = buildFormFromKg({ dsvId: id(100), dsv, dataset, byId: { ...byId, ...local }, subjects: [member, loose], groups: [group] })
  const g = data.subjectMetadata.subjectGroups[0]
  assert.equal(g.name, 'Patients')
  assert.deepEqual(g.subjects.map(x => x.subjectID), ['p-1'])
  assert.deepEqual(data.subjectMetadata.subjects.map(x => x.subjectID), ['free'])
  assert.deepEqual(g.groupState, { ageCategory: [KG + id(32)], attribute: [KG + id(33)], handedness: [KG + id(34)], pathology: [KG + id(9)], ageMin: '59', ageMinUnit: KG + id(30), ageMax: '92', ageMaxUnit: KG + id(30) })
  assert.equal(g.additionalRemarks, 'grp')
  assert.equal(counts.groups, 1)
})

test('tissue samples: flat ones keep the link to the subject and time point, collection samples belong to the collection', () => {
  const local = { ...byId }
  const put2 = (i) => { local[uuidOf(i['@id'])] = i; return i }
  // flat sample taken at the 2nd state of subject sub-035 (ids 20/21 above): its first state descends from that subject state
  put2(inst(70, 'TissueSampleState', { lookupLabel: 'ts1_state1', descendedFrom: ref(21), attribute: [ref(71)], pathology: [ref(9)], age: q(30, 30) }))
  put2(inst(72, 'TissueSampleState', { lookupLabel: 'ts1_state2', descendedFrom: ref(70), attribute: [ref(73)], relativeTimeIndication: q(2, 31), additionalRemarks: 'fixed' }))
  const flat = inst(74, 'TissueSample', { lookupLabel: 'ts1', studiedState: [ref(72), ref(70)], type: ref(75), laterality: ref(76), origin: ref(77), biologicalSex: ref(40), species: ref(6) })
  // a collection with one sample, linked to the 1st state of the subject
  put2(inst(80, 'TissueSampleCollectionState', { lookupLabel: 'c1_state', descendedFrom: ref(20), attribute: [ref(33)], age: range(5, 9, 30) }))
  put2(inst(81, 'TissueSampleState', { lookupLabel: 'cs1_state1' }))
  const coll = inst(82, 'TissueSampleCollection', { lookupLabel: 'c1', studiedState: [ref(80)], additionalRemarks: 'rem' })
  const inColl = inst(83, 'TissueSample', { lookupLabel: 'cs1', isPartOf: ref(82), studiedState: [ref(81)] })
  const { data, counts } = buildFormFromKg({ dsvId: id(100), dsv, dataset, byId: local, subjects: [subject], samples: [flat, inColl], collections: [coll] })
  const sub = data.subjectMetadata.subjects[0]
  const ts = data.subjectMetadata.tissueSamples
  assert.equal(ts.length, 1)
  assert.equal(ts[0].sampleID, 'ts1')
  assert.equal(ts[0].linkedSubjectId, sub.id)
  assert.equal(ts[0].linkedSubjectStateId, sub.states[1].id)      // the 2nd time point of the subject
  assert.deepEqual(sub.linkedSampleIds, [ts[0].id])
  assert.deepEqual(ts[0].states.map(x => x.additionalRemarks), ['', 'fixed'])
  assert.deepEqual(ts[0].states.map(x => x.tissueSampleAttribute), [[KG + id(71)], [KG + id(73)]])
  assert.equal(ts[0].states[1].relativeTimeValue, '2')
  assert.equal(ts[0].states[0].age, '30')
  assert.deepEqual(ts[0].pathology, [KG + id(9)])
  assert.equal(ts[0].type, KG + id(75)); assert.equal(ts[0].laterality, KG + id(76)); assert.equal(ts[0].origin, KG + id(77))
  assert.equal(ts[0].strain, KG + id(6)); assert.equal(ts[0].species, KG + id(7))
  const c = data.subjectMetadata.tissueCollections[0]
  assert.equal(c.collectionID, 'c1')
  assert.deepEqual(c.samples.map(x => x.sampleID), ['cs1'])
  assert.equal(c.samples[0].linkedSubjectId, null)                // linked through the collection
  assert.equal(c.linkedSubjectId, sub.id); assert.equal(c.linkedSubjectStateId, sub.states[0].id)
  assert.deepEqual(c.collectionState, { attribute: [KG + id(33)], ageMin: '5', ageMinUnit: KG + id(30), ageMax: '9', ageMaxUnit: KG + id(30) })
  assert.equal(c.additionalRemarks, 'rem')
  assert.equal(counts.tissueSamples, 2); assert.equal(counts.collections, 1)
  assert.equal(data.experiments.subjectschoice, 'Yes')
})

test('tissue samples alone also switch the subject step on', () => {
  const lone = inst(90, 'TissueSample', { lookupLabel: 'only', studiedState: [] })
  const { data } = buildFormFromKg({ dsvId: id(100), dsv, dataset, byId, subjects: [], samples: [lone] })
  assert.equal(data.experiments.subjectschoice, 'Yes')
  assert.equal(data.subjectMetadata.tissueSamples[0].states.length, 1)
})
