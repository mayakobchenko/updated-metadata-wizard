import test from 'node:test'
import assert from 'node:assert/strict'
import zlib from 'node:zlib'
import express from 'express'
import { rejectBrotliBody } from '../server/rejectCompressedBody.js'

const start = () => new Promise((resolve) => {
  const app = express()
  app.use(rejectBrotliBody)
  app.use(express.json())
  app.post('/x', (req, res) => res.json({ got: req.body }))
  const srv = app.listen(0, () => resolve(srv))
})

test('a Brotli-compressed request body is refused, plain and gzip bodies still work', async () => {
  const srv = await start(); const url = `http://127.0.0.1:${srv.address().port}/x`
  const body = JSON.stringify({ a: 1 })
  const br = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'content-encoding': 'br' }, body: zlib.brotliCompressSync(body) })
  assert.equal(br.status, 415)
  const plain = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body })
  assert.deepEqual((await plain.json()).got, { a: 1 })
  const gz = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'content-encoding': 'gzip' }, body: zlib.gzipSync(body) })
  assert.deepEqual((await gz.json()).got, { a: 1 })
  srv.close()
})
