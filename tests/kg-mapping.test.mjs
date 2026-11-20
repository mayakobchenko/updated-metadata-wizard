// KG mapping of the upload script: description, authors and custodian go to the Dataset only, not to the DatasetVersion.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const src = fs.readFileSync(new URL('../server/routes/python_scripts/python_upload_json.py', import.meta.url), 'utf8')
for (const key of ['description', 'author', 'custodian']) {
  test(`${key}: set on the Dataset, not on the DatasetVersion`, () => {
    assert.match(src, new RegExp(`dataset_attributes\\["${key}"\\]\\s*=`))
    assert.doesNotMatch(src, new RegExp(`dsv_attributes\\["${key}"\\]\\s*=`))
  })
}
test('title and short title stay on both', () => {
  for (const k of ['fullName', 'shortName']) {
    assert.match(src, new RegExp(`dsv_attributes\\["${k}"\\]\\s*=`))
    assert.match(src, new RegExp(`dataset_attributes\\["${k}"\\]\\s*=`))
  }
})

// order_authors: the data custodian is an author too, first by default, movable with contribution.custodianPosition
import { execFileSync } from 'node:child_process'
const orderAuthors = (slots, cust, pos) => {
  const fn = src.slice(src.indexOf('def order_authors'), src.indexOf('# ── resolve authors'))
  const code = `${fn}\nimport json,sys\nprint(json.dumps(order_authors(${JSON.stringify(slots).replace(/\[(\d+),/g, '($1,').replace(/"\]/g, '")')}, ${cust === null ? 'None' : JSON.stringify(cust)}, ${pos === undefined ? 'None' : JSON.stringify(pos)})))`
  return JSON.parse(execFileSync('python3', ['-I', '-c', code]).toString())
}
const A = [[0, 'http://a'], [1, 'http://b']]
test('custodian is added as first author by default', () => assert.deepEqual(orderAuthors(A, 'http://c'), ['http://c', 'http://a', 'http://b']))
test('custodian can be placed in the middle or last', () => {
  assert.deepEqual(orderAuthors(A, 'http://c', 2), ['http://a', 'http://c', 'http://b'])
  assert.deepEqual(orderAuthors(A, 'http://c', 3), ['http://a', 'http://b', 'http://c'])
  assert.deepEqual(orderAuthors(A, 'http://c', 99), ['http://a', 'http://b', 'http://c'])
})
test('a person listed as author and custodian appears once', () => assert.deepEqual(orderAuthors(A, 'http://b', 1), ['http://b', 'http://a']))
test('without a resolved custodian the authors are unchanged', () => assert.deepEqual(orderAuthors(A, null), ['http://a', 'http://b']))
test('organisations are written with fullName and shortName (the editor labels them by shortName)', () => {
  assert.match(src, /org_node = \{"@type": \[f"\{T\}Organization"\], "fullName": name, "shortName": name\}/)
  assert.match(src, /"fullName": name\.strip\(\), "shortName": name\.strip\(\)/)
})

// organisations of the common space are linked, not created again
const findCommon = (name, orgs) => {
  const fn = src.slice(src.indexOf('def find_common_organization'), src.indexOf('# ── KG helpers'))
  const code = `${fn}\nimport json\nprint(json.dumps(find_common_organization(${JSON.stringify(name)}, json.loads(${JSON.stringify(JSON.stringify(orgs))}))))`
  return JSON.parse(execFileSync('python3', ['-I', '-c', code]).toString())
}
const ORGS = [{ uuid: 'https://kg.ebrains.eu/api/instances/k1', fullName: 'Kavli Institute for Systems Neuroscience' }, { uuid: 'https://kg.ebrains.eu/api/instances/x', fullName: 'Other' }, { uuid: 'https://kg.ebrains.eu/api/instances/e' }]
test('an organisation of the common space is found by its full name (case and spaces ignored)', () => {
  assert.equal(findCommon('Kavli Institute for Systems Neuroscience', ORGS), 'https://kg.ebrains.eu/api/instances/k1')
  assert.equal(findCommon('  kavli institute for systems neuroscience ', ORGS), 'https://kg.ebrains.eu/api/instances/k1')
})
test('an unknown or empty name is not found', () => {
  assert.equal(findCommon('Nowhere University', ORGS), null)
  assert.equal(findCommon('', ORGS), null)
})
test('find_or_create_organization looks in the common space first', () => {
  const i = src.indexOf('def find_or_create_organization')
  assert.ok(src.indexOf('find_common_organization(name, _org_list)', i) > i && src.indexOf('find_common_organization(name, _org_list)', i) < src.indexOf('find_organization_in_collab(name)', i))
})

test('upload script probes the dataset version space before writing and reports failure details', () => {
  assert.match(src, /EXPECTED_SPACE = f"collab-d-\{dsv_id\}"/)
  assert.match(src, /"kind":\s*"no_write_access"/)
  assert.match(src, /KG_patch\(dsv_id, dsv_attributes, space=dsv_space\)/)
  assert.match(src, /"status":\s*resp\.status_code/)
})
