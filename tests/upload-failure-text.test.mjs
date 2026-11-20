import test from 'node:test'
import assert from 'node:assert/strict'
import { summarizeFailures, describeStep } from '../server/routes/uploadFailureText.js'

const denied = [
  { where: '[0]/datasetVersion', error: 'KG returned 403', status: 403, space: 'dataset', instance: 'dsv1' },
  { where: '[1]/dataset', error: 'KG returned 403', status: 403, space: 'dataset' },
  { where: '[54]/attachSpecimen', error: 'KG returned 403', status: 403 },
]

test('all 403 -> access denied wording, mentions space and uploader', () => {
  const { user, curator } = summarizeFailures({ failures: denied, written: 57, uploader: 'maya', space: 'dataset' })
  assert.match(user, /access denied/)
  assert.match(user, /maya/)
  assert.match(user, /57 other items/)
  assert.match(curator, /Items NOT written: 3/)
  assert.match(curator, /space "dataset"/)
  assert.match(curator, /NOT linked to the dataset version/)
})

test('5xx -> temporary problem wording', () => {
  const { user } = summarizeFailures({ failures: [{ where: '[2]/author', error: 'KG returned 503', status: 503 }] })
  assert.match(user, /temporary problem/)
})

test('status is parsed from the error text when missing', () => {
  const { user } = summarizeFailures({ failures: [{ where: 'dataset', error: 'KG returned 403 - x' }] })
  assert.match(user, /access denied/)
})

test('long lists are truncated in the curator text', () => {
  const failures = Array.from({ length: 20 }, (_, i) => ({ where: `[${i}]/author`, error: 'KG returned 500', status: 500 }))
  assert.match(summarizeFailures({ failures }).curator, /and 8 more/)
})

test('describeStep names the steps', () => {
  assert.match(describeStep('[0]/datasetVersion'), /dataset version/)
  assert.match(describeStep('[54]/attachSpecimen'), /subjects/)
})
