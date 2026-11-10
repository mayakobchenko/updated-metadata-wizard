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
