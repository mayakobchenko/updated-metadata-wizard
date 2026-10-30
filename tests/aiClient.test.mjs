// Run with: npm run test:unit   (Node's built-in test runner, no extra packages, no API keys, no network)
import test from 'node:test'
import assert from 'node:assert/strict'
import { askAi, testAiSettings } from '../src/components/aiClient.js'

const reply = (status, body, { text } = {}) => async () => ({
  ok: status >= 200 && status < 300, status,
  text: async () => text ?? (typeof body === 'string' ? body : JSON.stringify(body)),
})
const OPENAI = { provider: 'openai', key: 'sk-test123', model: '' }
const ANTH = { provider: 'anthropic', key: 'sk-ant-test123', model: '' }
const OTHER = { provider: 'compatible', key: 'abc123', model: 'llama-3', baseUrl: 'https://api.example.org/v1' }
const fail = async (settings, fetchImpl, opts = {}) => {
  try { await askAi('hello', settings, { fetchImpl, ...opts }) } catch (e) { return e }
  assert.fail('expected an error')
}

test('success: OpenAI and Anthropic answer shapes', async () => {
  assert.equal(await askAi('x', OPENAI, { fetchImpl: reply(200, { choices: [{ message: { content: ' hi ' } }] }) }), 'hi')
  assert.equal(await askAi('x', ANTH, { fetchImpl: reply(200, { content: [{ type: 'text', text: 'hello' }] }) }), 'hello')
  assert.equal(await testAiSettings(ANTH, { fetchImpl: reply(200, { content: [{ type: 'text', text: 'OK' }] }) }), true)
})

test('the key is trimmed and sent without whitespace; a key with odd characters is refused before any request', async () => {
  let sent
  await askAi('x', { ...OPENAI, key: '  sk-abc \n' }, { fetchImpl: async (u, o) => { sent = o.headers.Authorization; return reply(200, { choices: [{ message: { content: 'a' } }] })() } })
  assert.equal(sent, 'Bearer sk-abc')
  let called = false
  const e = await fail({ ...OPENAI, key: 'sk-ab c' }, async () => { called = true })
  assert.match(e.message, /space or a character that is not allowed/)
  assert.equal(called, false); assert.equal(e.fatal, true)
  assert.match((await fail({ ...OPENAI, key: 'sk-“quoted”' }, async () => {})).message, /not allowed/)
})

test('401: wrong key, with a hint when the key belongs to another provider', async () => {
  let e = await fail(OPENAI, reply(401, { error: { message: 'Incorrect API key provided' } }))
  assert.match(e.message, /did not accept the API key \(HTTP 401\)/); assert.match(e.message, /Incorrect API key provided/); assert.equal(e.fatal, true)
  e = await fail({ ...OPENAI, key: 'sk-ant-xyz' }, reply(401, { error: { message: 'bad' } }))
  assert.match(e.message, /looks like an Anthropic key, but OpenAI is selected/)
  e = await fail({ ...ANTH, key: 'sk-proj-xyz' }, reply(401, { error: { message: 'invalid x-api-key' } }))
  assert.match(e.message, /does not look like an Anthropic key/)
  e = await fail(OTHER, reply(401, { error: 'unauthorized' }))
  assert.match(e.message, /provider address: api\.example\.org/)
})

test('403: key not allowed for this model/service', async () => {
  const e = await fail(OPENAI, reply(403, { error: { message: 'Project does not have access to model' } }))
  assert.match(e.message, /refused the request \(HTTP 403\)/); assert.match(e.message, /Project does not have access/); assert.equal(e.fatal, true)
})

test('404: model or address not found names the model and the host', async () => {
  const e = await fail({ ...OPENAI, model: 'gpt-9' }, reply(404, { error: { message: 'The model `gpt-9` does not exist' } }))
  assert.match(e.message, /could not find the model "gpt-9" at api\.openai\.com \(HTTP 404\)/); assert.equal(e.fatal, true)
})

test('400: too large, manuscript not accepted, bad model, other', async () => {
  let e = await fail(ANTH, reply(400, { error: { message: 'prompt is too long: 250000 tokens > 200000 maximum' } }))
  assert.match(e.message, /too large for this model/)
  e = await fail(OPENAI, reply(400, { error: { message: 'Invalid file type: pdf not supported' } }), { attachments: [{ name: 'a.pdf', base64: 'QQ==' }] })
  assert.match(e.message, /does not accept the uploaded manuscript/)
  e = await fail({ ...OPENAI, model: 'foo' }, reply(400, { error: { message: 'Unsupported model: foo' } }))
  assert.match(e.message, /does not accept the model "foo"/)
  e = await fail(OPENAI, reply(400, { error: { message: 'something else' } }))
  assert.match(e.message, /rejected the request \(HTTP 400\)/); assert.equal(e.fatal, false)
})

test('402, 413', async () => {
  assert.match((await fail(OPENAI, reply(402, {}))).message, /no credit or needs payment/)
  assert.match((await fail(OPENAI, reply(413, {}))).message, /too large/)
})

test('429: quota used up is fatal, plain rate limit is not', async () => {
  let e = await fail(OPENAI, reply(429, { error: { message: 'You exceeded your current quota, please check your plan and billing details.' } }))
  assert.match(e.message, /quota or credit of this account is used up/); assert.equal(e.fatal, true)
  e = await fail(OPENAI, reply(429, { error: { message: 'Rate limit reached for requests' } }))
  assert.match(e.message, /limiting the number of requests/); assert.equal(e.fatal, false)
})

test('5xx and 529: provider unavailable, not fatal', async () => {
  for (const st of [500, 502, 503, 529]) {
    const e = await fail(ANTH, reply(st, { error: { message: 'Overloaded' } }))
    assert.match(e.message, new RegExp(`temporarily unavailable \\(HTTP ${st}\\)`)); assert.equal(e.fatal, false)
  }
})

test('a web page instead of an API answer points at the address', async () => {
  let e = await fail(OTHER, reply(404, '', { text: '<!DOCTYPE html><html>Not found</html>' }))
  assert.match(e.message, /answered with a web page/); assert.match(e.message, /api\.example\.org/)
  e = await fail(OTHER, reply(200, '', { text: '<html>login</html>' }))
  assert.match(e.message, /not with an API answer/); assert.equal(e.fatal, true)
})

test('empty answer and empty body', async () => {
  assert.match((await fail(OPENAI, reply(200, { choices: [{ message: { content: '' } }] }))).message, /empty answer/)
  assert.match((await fail(OPENAI, reply(200, '', { text: '' }))).message, /not with an API answer/)
})

test('network error: names the host and the usual reasons (CORS, address, VPN)', async () => {
  const e = await fail(OPENAI, async () => { throw new TypeError('Failed to fetch') })
  assert.match(e.message, /Could not reach OpenAI at api\.openai\.com/); assert.match(e.message, /does not allow requests from web pages/); assert.equal(e.fatal, true)
  const e2 = await fail(OTHER, async () => { throw new TypeError('Failed to fetch') })
  assert.match(e2.message, /api\.example\.org/)
})

test('timeout', async () => {
  const e = await fail(OPENAI, (u, o) => new Promise((_, rej) => o.signal.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' })))), { timeoutMs: 30 })
  assert.match(e.message, /did not answer within/)
})

test('missing model or address for other providers', async () => {
  assert.match((await fail({ ...OTHER, model: '' }, async () => {})).message, /model name/)
  assert.match((await fail({ ...OTHER, baseUrl: 'http://x' }, async () => {})).message, /https:\/\//)
  assert.match((await fail({ ...OTHER }, async () => {}, { attachments: [{ name: 'a.pdf', base64: 'QQ==' }] })).message, /manuscript/)
})
