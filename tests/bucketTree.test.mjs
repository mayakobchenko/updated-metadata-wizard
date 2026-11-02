import test from 'node:test'
import assert from 'node:assert/strict'
import { describeBucket } from '../server/KG_utils/bucketTree.js'

// Layout like an NWB dataset where file names differ by cohort (HZ/WT + JV/YA), side (L/R) and run
function nwbBucket() {
  const objs = []
  const cohorts = ['HZ+JV', 'WT+JV', 'HZ+YA', 'WT+YA']
  let sub = 3
  for (const folder of ['figure-3', 'figure-S3']) {
    for (const c of cohorts) for (const side of ['L', 'R']) for (const run of [2, 3]) {
      sub++
      const name = `sub-${String(sub).padStart(3, '0')}_ses-2022${String(10 + (sub % 2)).padStart(2, '0')}26${side}${1 + (sub % 5)}_cohort-${c}_run-${String(run).padStart(4, '0')}_ecephys+icephys.nwb`
      objs.push({ name: `data/${folder}/${name}`, bytes: 50e6 })
    }
  }
  return objs
}

test('files differing only in cohort / side / run become one line per folder', () => {
  const { tree } = describeBucket(nwbBucket(), 'b', { standards: ['NWB'] })
  const lines = tree.split('\n').filter(l => l.includes('.nwb'))
  assert.equal(lines.length, 2, tree)          // one line per folder (32 files)
  assert.match(lines[0], /cohort-<HZ\+JV\|WT\+JV\|HZ\+YA\|WT\+YA>/)
  assert.match(lines[0], /ses-XXXXXXXX\[LR\]X/)
  assert.match(lines[0], /run-XXXX/)
  assert.match(lines[0], /extracellular and intracellular electrophysiology recording/)
  assert.ok(!/NWB file: extracellular electrophysiology recording and/.test(tree))
})

test('different modalities stay separate lines', () => {
  const objs = nwbBucket().concat([1, 2, 3].map(i => ({ name: `data/figure-3/sub-00${i}_ses-20220101L1_cohort-WT+JV_icephys.nwb`, bytes: 1e6 })))
  const { tree } = describeBucket(objs, 'b', { standards: ['NWB'] })
  assert.equal(tree.split('\n').filter(l => l.includes('.nwb')).length >= 2, true)
})
