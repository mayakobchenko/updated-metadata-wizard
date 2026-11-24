import test from 'node:test'
import assert from 'node:assert/strict'

process.env.KG_CORE_API = 'http://kg.test/v3/instances'
const { fetchCollabContent, KgReadError } = await import('../server/KG_utils/kgCollabContent.js')

const V = 'https://openminds.om-i.org/props/'
const T = 'https://openminds.om-i.org/types/'
const KG = 'https://kg.ebrains.eu/api/instances/'
const SPACE = 'https://core.kg.ebrains.eu/vocab/meta/space'
const id = (n) => `${n.toString(16).padStart(8, '0')}-0000-4000-8000-000000000000`
const ref = (n) => ({ '@id': KG + id(n) })
const inst = (n, type, space, props = {}) => ({ '@id': KG + id(n), '@type': [T + type], [SPACE]: space, ...Object.fromEntries(Object.entries(props).map(([k, v]) => [V + k, v])) })

const DSV = id(100)
const COLLAB = `collab-d-${DSV}`
const db = [
  inst(100, 'DatasetVersion', 'dataset', { fullName: 'Title', license: ref(50) }),
  inst(101, 'Dataset', 'dataset', { description: 'Summary', author: [ref(1)], custodian: ref(1), hasVersion: [ref(100)] }),
  inst(1, 'Person', COLLAB, { givenName: 'Ann', familyName: 'Lee', digitalIdentifier: [ref(2)] }),
  inst(2, 'ORCID', COLLAB, { identifier: 'https://orcid.org/0000-0001-0000-0000' }),
  inst(20, 'Subject', COLLAB, { lookupLabel: 'sub-1', studiedState: [ref(21)] }),
  inst(21, 'SubjectState', COLLAB, { lookupLabel: 'sub-1_state1', age: { '@type': [T + 'QuantitativeValue'], [V + 'value']: 5, [V + 'unit']: ref(30) } }),
  inst(40, 'TissueSample', COLLAB, {}),
]
const calls = []

function fakeFetch({ deny = null } = {}) {
  return async (url) => {
    const u = new URL(url); calls.push(u.pathname + u.search)
    const json = (status, body) => ({ status, ok: status < 400, json: async () => body })
    if (deny && u.pathname.includes(deny)) return json(403, {})
    const m = u.pathname.match(/\/instances\/([0-9a-f-]{36})(\/neighbors)?$/)
    if (m && m[2]) return json(200, { data: { inbound: db.filter(x => (x[V + 'hasVersion'] || []).some(r => r['@id'].endsWith(m[1]))).map(x => ({ id: x['@id'].split('/').pop(), types: x['@type'] })) } })
    if (m) { const x = db.find(d => d['@id'].endsWith(m[1])); return x ? json(200, { data: x }) : json(404, {}) }
    if (u.pathname.endsWith('/instances')) {
      const type = u.searchParams.get('type'); const space = u.searchParams.get('space')
      return json(200, { data: db.filter(x => x['@type'][0] === type && x[SPACE] === space) })
    }
    return json(404, {})
  }
}

test('reads the dataset version, the parent dataset, persons and the collab subjects', async () => {
  globalThis.fetch = fakeFetch()
  const r = await fetchCollabContent('tok', DSV.toUpperCase())
  assert.equal(r.data.dataset1.dataTitle, 'Title')
  assert.equal(r.data.dataset1.briefSummary, 'Summary')           // from the Dataset, found through the neighbours
  assert.deepEqual(r.data.custodian, { firstName: 'Ann', familyName: 'Lee', orcid: '0000-0001-0000-0000' })
  assert.equal(r.data.subjectMetadata.subjects[0].subjectID, 'sub-1')
  assert.equal(r.data.subjectMetadata.subjects[0].states[0].age, '5')
  assert.ok(r.notes.some(n => /1 tissue samples/.test(n)))
  assert.ok(calls.some(c => c.includes(`space=${COLLAB}`)))
})

test('an unknown dataset version is a clear error', async () => {
  globalThis.fetch = fakeFetch()
  await assert.rejects(() => fetchCollabContent('tok', id(999)), (e) => e instanceof KgReadError && e.status === 404 && e.code === 'NOT_FOUND')
})

test('no read access is reported as such, not as a crash', async () => {
  globalThis.fetch = fakeFetch({ deny: id(100) })
  await assert.rejects(() => fetchCollabContent('tok', DSV), (e) => e instanceof KgReadError && e.status === 403 && /not allowed/.test(e.message))
})
