// Organisation list: homepage/identifier shaping on the server.
import test from 'node:test'
import assert from 'node:assert/strict'
import { firstString, resolveOrganizationIdentifier } from '../server/KG_utils/organizationIdentifier.js'
const ROR = [{ uuid: 'https://kg.ebrains.eu/api/instances/r1', identifier: 'https://ror.org/04m5j1k67' }]
test('digitalIdentifier as a single link or a list resolves to the ROR text', () => {
  assert.equal(resolveOrganizationIdentifier({ '@id': 'https://kg.ebrains.eu/api/instances/r1' }, ROR), 'https://ror.org/04m5j1k67')
  assert.equal(resolveOrganizationIdentifier([{ '@id': 'https://kg.ebrains.eu/api/instances/r1' }], ROR), 'https://ror.org/04m5j1k67')
})
test('an identifier that is not a ROR, or nothing, gives an empty text', () => {
  assert.equal(resolveOrganizationIdentifier({ '@id': 'https://kg.ebrains.eu/api/instances/other' }, ROR), '')
  assert.equal(resolveOrganizationIdentifier(undefined, ROR), '')
  assert.equal(resolveOrganizationIdentifier({ '@id': 'x' }, []), '')
})
test('firstString: text, link or list', () => {
  assert.equal(firstString('https://a.org/'), 'https://a.org/')
  assert.equal(firstString(['https://a.org/', 'b']), 'https://a.org/')
  assert.equal(firstString({ '@id': 'https://a.org/' }), 'https://a.org/')
  assert.equal(firstString(null), '')
})
