// The Subjects check works on the data: a complete draft needs no walk through the step.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { subjectProblems, missingRequired } from '../src/components/requiredFields.js'
const state = (o = {}) => ({ ageCategory: 'a', subjectAttribute: ['x'], ...o })
const sub = (o = {}) => ({ id: 1, species: 's', states: [state()], ...o })
test('complete subjects: no problems', () => assert.deepEqual(subjectProblems({ subjects: [sub(), sub({ id: 2 })] }), []))
test('missing species, age category and attribute are counted', () => {
  const p = subjectProblems({ subjects: [sub({ species: '' }), sub({ id: 2, states: [state({ ageCategory: '' }), state({ subjectAttribute: [] })] })] })
  assert.deepEqual(p, ['1 subject(s) without a species', '1 subject state(s) without an age category', '1 subject state(s) without an attribute'])
})
test('nothing entered', () => assert.deepEqual(subjectProblems({}), ['no subjects or tissue samples entered']))
test('a tissue sample without link, type or origin', () => {
  const p = subjectProblems({ subjects: [sub()], tissueSamples: [{ id: 5, states: [{ tissueSampleAttribute: ['t'] }] }] })
  assert.ok(p.some(x => /without a type/.test(x)) && p.some(x => /without an origin/.test(x)) && p.some(x => /not linked/.test(x)))
})
test('missingRequired: complete subjects do not block a draft that was never opened in the Subjects step', () => {
  const d = { experiments: { subjectschoice: 'Yes' }, subjectMetadata: { subjects: [sub()] } }
  assert.ok(!missingRequired(d, { subjectsDone: false }).some(x => x.title === 'Subjects'))
  const bad = { experiments: { subjectschoice: 'Yes' }, subjectMetadata: { subjects: [sub({ species: '' })] } }
  const r = missingRequired(bad, { subjectsDone: false }).find(x => x.title === 'Subjects')
  assert.match(r.items[0], /1 subject\(s\) without a species/)
})
const real = '/mnt/user-data/attachments/e33fbf99-34f8-535c-8101-4bf56a2a4430/87c2026c-metadata_Spatial_navigation_during_development_1794989072673.json'
test('the Spatial navigation draft (23 subjects) is complete', { skip: !fs.existsSync(real) }, () => {
  assert.deepEqual(subjectProblems(JSON.parse(fs.readFileSync(real, 'utf8')).subjectMetadata), [])
})
