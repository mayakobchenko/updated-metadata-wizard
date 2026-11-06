import test from 'node:test'
import assert from 'node:assert/strict'
import { findDatasetCandidates } from '../server/routes/ticketDatasets.js'

const A = '3e449b04-cb98-4da1-9459-097e1d4292db', B = '1d3b3d4a-6249-42d9-bf99-927470d13774', C = '86d0de75-8cbc-4f32-b212-aa2409471117'
const body = `EBRAINS Curation Request Accepted
Data Sharing Collab: https://wiki.ebrains.eu/bin/view/Collabs/d-${A}/
Dataset Working Title: Normal rat brain tyrosine hydroxylase chemoarchitecture

Data Sharing Collab: https://wiki.ebrains.eu/bin/view/Collabs/d-${B}/
Dataset Working Title: Normal rat brain choline acetyltransferase chemoarchitecture

Data Sharing Collab: https://wiki.ebrains.eu/bin/view/Collabs/d-${C}/
Dataset Working Title: Normal rat brain viral tract tracing`

test('a ticket with three datasets lists all three, in order, with titles', () => {
  const r = findDatasetCandidates([{ body }, { body: body.toUpperCase() }])
  assert.deepEqual(r.map(c => c.id), [A, B, C])
  assert.equal(r[1].title, 'Normal rat brain choline acetyltransferase chemoarchitecture')
  assert.equal(r[2].title, 'Normal rat brain viral tract tracing')
})

test('one dataset, no title, and a ticket without any Collab', () => {
  assert.deepEqual(findDatasetCandidates([{ body: `Data sharing collab: https://x/d-${A}` }]), [{ id: A, title: '' }])
  assert.deepEqual(findDatasetCandidates([{ body: 'nothing here' }, {}]), [])
})

test('only the best rule counts: labelled Collabs win over a stray link', () => {
  const r = findDatasetCandidates([{ body: `see also https://wiki/Collabs/d-${C}` }, { body: `Data Sharing Collab: https://wiki/Collabs/d-${A}/\nDataset Working Title: T` }])
  assert.deepEqual(r.map(c => c.id), [A])
})
