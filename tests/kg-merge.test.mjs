import test from 'node:test'
import assert from 'node:assert/strict'
import { mergeKgIntoForm, describeAdded } from '../src/components/kgMerge.js'
import { readWizardParams, buildWizardSearch } from '../src/components/wizardUrl.js'

const kg = {
  datasetVersionId: 'kg-id',
  dataset1: { dataTitle: 'KG title', briefSummary: 'KG summary', license: 'L', embargo: true, optionsData: ['a', 'b'] },
  dataset2: { supportChannels: [{ id: 1, newChannel: 'a@b.no' }], relatedPublications: [{ id: 2, newPublication: '10.1/x' }] },
  contribution: { custodianPosition: 2, authors: [
    { id: 1, firstName: 'Ann', lastName: 'Lee', orcid: '0000-0001-0000-0000' },
    { id: 2, firstName: 'Bo', lastName: 'Ek', orcid: '' } ] },
  experiments: { techniques: ['t1', 't2'] },
  subjectMetadata: { subjects: [{ id: 1, subjectID: 'sub-1', states: [{}] }, { id: 2, subjectID: 'sub-2', states: [{}] }] },
}

test('empty base: everything from the KG, the dataset id is never changed', () => {
  const { data, added } = mergeKgIntoForm({ datasetVersionId: 'mine' }, kg)
  assert.equal(data.datasetVersionId, 'mine')
  assert.equal(data.dataset1.dataTitle, 'KG title')
  assert.equal(data.subjectMetadata.subjects.length, 2)
  assert.equal(added.subjects, 2)
  assert.equal(added.authors, 2)
})

test('what the draft has stays; only the gaps are filled and missing entries added', () => {
  const base = {
    datasetVersionId: 'mine',
    dataset1: { dataTitle: 'My title', briefSummary: '', embargo: false, optionsData: ['b', 'c'] },
    contribution: { authors: [{ id: 9, firstName: 'ann', lastName: 'LEE', orcid: 'https://orcid.org/0000-0001-0000-0000' }] },
    experiments: { techniques: ['t2'] },
    subjectMetadata: { subjects: [{ id: 5, subjectID: 'SUB-1', states: [{ age: '3' }] }] },
  }
  const { data, added } = mergeKgIntoForm(base, kg)
  assert.equal(data.dataset1.dataTitle, 'My title')              // kept
  assert.equal(data.dataset1.briefSummary, 'KG summary')         // gap filled
  assert.equal(data.dataset1.embargo, true)                      // false counts as empty
  assert.deepEqual(data.dataset1.optionsData, ['b', 'c', 'a'])
  assert.deepEqual(data.experiments.techniques, ['t2', 't1'])
  assert.equal(data.contribution.authors.length, 2)              // Ann Lee is the same person (ORCID), Bo Ek is new
  assert.equal(data.contribution.authors[0].id, 9)
  assert.equal(data.subjectMetadata.subjects.length, 2)          // sub-1 is in the draft (any case), sub-2 is new
  assert.deepEqual(data.subjectMetadata.subjects[0].states, [{ age: '3' }])
  assert.equal(added.subjects, 1)
  assert.equal(added.authors, 1)
  assert.match(describeAdded(added), /1 subject, 1 author/)
})

test('prefer kg: the KG wins where it has a value, nothing of the form is removed', () => {
  const base = { dataset1: { dataTitle: 'My title', shortTitle: 'mine' }, subjectMetadata: { subjects: [{ id: 5, subjectID: 'sub-1', states: [{ age: '3' }] }, { id: 6, subjectID: 'only-mine', states: [] }] } }
  const { data } = mergeKgIntoForm(base, kg, { prefer: 'kg' })
  assert.equal(data.dataset1.dataTitle, 'KG title')
  assert.equal(data.dataset1.shortTitle, 'mine')
  assert.deepEqual(data.subjectMetadata.subjects.map(s => s.subjectID), ['sub-1', 'only-mine', 'sub-2'])
  assert.deepEqual(data.subjectMetadata.subjects[0].states, [{}])
})

test('dayjs-like objects are values, not merged', () => {
  class D { constructor(v) { this.v = v } }
  const d = new D(1)
  const { data } = mergeKgIntoForm({ dataset1: { embargoDate: d } }, { dataset1: { embargoDate: '2027-01-01' } })
  assert.equal(data.dataset1.embargoDate, d)
})

test('nothing to add reports no change', () => {
  const { changed } = mergeKgIntoForm({ dataset1: { dataTitle: 'x' } }, { dataset1: { dataTitle: 'y' } })
  assert.equal(changed, false)
})

test('link parameters: ticket, dataset version, both, any letter case', () => {
  const id = '3e860b3e-967c-425d-aa68-120451c5fe4b'
  assert.deepEqual(readWizardParams('?TicketNumber=4829200'), { ticket: '4829200', datasetVersionId: '' })
  assert.deepEqual(readWizardParams(`?DatasetVersionUUID=${id}`), { ticket: '', datasetVersionId: id })
  assert.deepEqual(readWizardParams(`?ticketnumber=1&datasetversionuuid=${id.toUpperCase()}`), { ticket: '1', datasetVersionId: id })
  assert.deepEqual(readWizardParams('?DatasetVersionUUID=not-a-uuid&TicketNumber=<script>'), { ticket: '', datasetVersionId: '' })
  assert.equal(buildWizardSearch({ ticket: '1', datasetVersionId: id }), `?TicketNumber=1&DatasetVersionUUID=${id}`)
  assert.equal(buildWizardSearch({}), '')
})
