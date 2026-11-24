import test from 'node:test'
import assert from 'node:assert/strict'
import { readWizardParams } from '../src/components/wizardUrl.js'


test('wrongly written links are understood', () => {
  const U = '724d4af0-fe28-4032-8837-120b0d64a81c'
  for (const q of [`?TicketNumber=4826029?DatasetVersionUUID=${U}`, `?TicketNumber=4826029DatasetVersionUUID=${U}`, `?TicketNumber=4826029&DatasetVersionUUID=${U}`, `?TicketNumber=4826029%3FDatasetVersionUUID=${U}`]) {
    assert.deepEqual(readWizardParams(q), { ticket: '4826029', datasetVersionId: U }, q)
  }
  assert.deepEqual(readWizardParams('?TicketNumber=4826029'), { ticket: '4826029', datasetVersionId: '' })
})
