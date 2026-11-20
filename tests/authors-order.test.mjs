// Author order: the data custodian is the first author by default and can be moved.
import test from 'node:test'
import assert from 'node:assert/strict'
import { authorSequence, fromSequence, buildAuthorTable } from '../src/components/authorModel.js'
const mk = (pos) => ({
  custodian: { firstName: 'Edvard', familyName: 'Moser', institution: 'Kavli' },
  contribution: {
    ...(pos ? { custodianPosition: pos } : {}),
    authors: [
      { id: 1, isCustom: true, firstName: 'Matteo', lastName: 'G', affiliationIds: ['custodian-aff'] },
      { id: 2, isCustom: true, firstName: 'Simon', lastName: 'B', affiliationIds: ['custodian-aff'] },
    ],
  },
})
const names = (d) => buildAuthorTable(d).authors.map(a => a.name)
test('custodian first by default', () => assert.deepEqual(names(mk()), ['Edvard Moser', 'Matteo G', 'Simon B']))
test('custodian in the middle / last', () => {
  assert.deepEqual(names(mk(2)), ['Matteo G', 'Edvard Moser', 'Simon B'])
  assert.deepEqual(names(mk(3)), ['Matteo G', 'Simon B', 'Edvard Moser'])
  assert.deepEqual(names(mk(9)), ['Matteo G', 'Simon B', 'Edvard Moser'])
})
test('sequence and fromSequence round trip', () => {
  const seq = authorSequence(mk(2))
  assert.deepEqual(seq.map(x => x.kind), ['author', 'custodian', 'author'])
  const moved = [seq[2], ...seq.slice(0, 2)]            // Simon becomes first author
  assert.deepEqual(fromSequence(moved), { authorOrder: [1, 0], custodianPosition: 3 })
})
test('no custodian name: the authors alone', () => assert.deepEqual(authorSequence({ contribution: { authors: [{}, {}] } }, false).length, 2))
