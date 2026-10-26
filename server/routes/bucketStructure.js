// POST /api/bucket/structure  { datasetVersionId, token? }
// READ-ONLY: lists file NAMES and sizes in the dataset's data-proxy bucket and
// returns a ready-to-edit file-structure description for the Data Descriptor.
// File contents are never downloaded, nothing is written or deleted.
import express from 'express'
import logger from '../logger.js'
import { getUserAccessToken } from './userSessions.js'
import { describeBucket } from '../KG_utils/bucketTree.js'

const router = express.Router()
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const BASE = 'https://data-proxy.ebrains.eu/api/v1'
const PAGE_SIZES = [1000, 100]  // fall back to 100 (known to work) if the API rejects 1000
// Very large buckets (tens of thousands of files) cannot be listed within the time a web request may take, and a
// tree of that many names is not useful anyway. Listing stops at the first limit that is reached and the answer
// is marked as partial (the researcher is told).
const MAX_FILES = Number(process.env.BUCKET_MAX_FILES) || 50000
const TIME_BUDGET_MS = Number(process.env.BUCKET_TIME_BUDGET_MS) || 35000

class ProxyError extends Error {
  constructor(status, message) { super(message); this.status = status }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const TRANSIENT = [429, 500, 502, 503, 504]

// Short outages of the data-proxy (or a slow answer) are common right after a login or an upload, and a
// researcher would not know to try again, so transient failures are retried here before an error is reported.
async function proxyGet(url, token, deadline) {
  let lastErr
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { accept: 'application/json', Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(Math.min(30000, Math.max(5000, deadline - Date.now()))) })
      if (res.ok) return await res.json()
      lastErr = new ProxyError(res.status, `data-proxy answered ${res.status} ${res.statusText}`)
      if (!TRANSIENT.includes(res.status)) throw lastErr
    } catch (e) {
      if (e instanceof ProxyError && !TRANSIENT.includes(e.status)) throw e
      lastErr = e instanceof ProxyError ? e : new ProxyError(0, `data-proxy not reachable: ${e.message}`)
    }
    if (attempt >= 2 || Date.now() >= deadline - 5000) break
    logger.warn(`bucket structure: retrying (${lastErr.message})`); await sleep(1000 * (attempt + 1) * 2)
  }
  throw lastErr
}

// Pages with marker = last object name until an empty page comes back.
// `datasets/<uuid>` is tried first (the endpoint the curators verified); if it
// does not exist for this id, the `buckets/d-<uuid>` endpoint is used.
async function listAll(uuid, token) {
  const deadline = Date.now() + TIME_BUDGET_MS
  const endpoints = [`${BASE}/datasets/${uuid}`, `${BASE}/buckets/d-${uuid}`]
  let lastErr
  for (const endpoint of endpoints) {
    try {
      const objects = []
      let pageSize = PAGE_SIZES[0]
      let marker = ''
      let truncated = ''   // '' = complete, otherwise why the listing stopped: 'count' | 'time' | 'error'
      for (let page = 0; ; page++) {
        if (objects.length >= MAX_FILES) { truncated = 'count'; break }
        if (Date.now() >= deadline) { truncated = 'time'; break }
        const qs = new URLSearchParams({ limit: String(pageSize) })
        if (marker) qs.set('marker', marker)
        let body
        try {
          body = await proxyGet(`${endpoint}?${qs}`, token, deadline)
        } catch (e) {
          if ([400, 422].includes(e.status) && pageSize !== PAGE_SIZES[1]) { pageSize = PAGE_SIZES[1]; page--; continue }
          // something was read already: a partial answer is better than none
          if (objects.length && (e.status === 0 || TRANSIENT.includes(e.status))) { truncated = 'error'; break }
          throw e
        }
        const items = (body.objects || []).filter(o => o.name && !o.subdir)
        if (!items.length) break
        for (const o of items) objects.push({ name: o.name, bytes: Number(o.bytes) || 0 })
        const next = (body.objects || [])[(body.objects || []).length - 1].name
        if (next === marker) break
        marker = next
      }
      return { objects, truncated }
    } catch (e) {
      lastErr = e
      if (![404, 405].includes(e.status)) throw e   // auth/server problems: do not retry elsewhere
    }
  }
  throw lastErr
}

router.post('/structure', async (req, res) => {
  const raw = String(req.body?.datasetVersionId || '').trim().replace(/^d-/, '')
  if (!UUID.test(raw)) {
    return res.status(400).json({ code: 'BAD_ID', error: 'Please enter a valid dataset version UUID (the bucket is named d-<uuid>).' })
  }
  const uuid = raw.toLowerCase()
  // a token pasted by the user wins; otherwise the token of the logged-in user
  const pasted = typeof req.body?.token === 'string' ? req.body.token.trim().replace(/^Bearer\s+/i, '') : ''
  const token = pasted || await getUserAccessToken(req)
  if (!token) {
    return res.status(401).json({ code: 'NO_TOKEN', error: 'Your login session has no usable EBRAINS token. Please log in again, or paste a token below.' })
  }
  try {
    const { objects, truncated } = await listAll(uuid, token)
    if (!objects.length) {
      return res.status(404).json({ code: 'EMPTY', error: `The bucket d-${uuid} is empty or has no files yet.` })
    }
    const result = describeBucket(objects, `d-${uuid}`, { partial: !!truncated })
    logger.info(`bucket structure: d-${uuid} ${objects.length} files${truncated ? ` (partial: ${truncated})` : ''}`)
    res.json({ bucket: `d-${uuid}`, truncated: !!truncated, truncatedReason: truncated || null, ...result })
  } catch (e) {
    logger.error(`bucket structure failed for d-${uuid}: ${e.message}`)
    if (e.status === 401 || e.status === 403) {
      return res.status(e.status).json({ code: 'DENIED', error: 'The EBRAINS data-proxy did not accept this token for that bucket. Please log in again, check that you have access to the bucket, or paste a token.' })
    }
    if (e.status === 404) {
      return res.status(404).json({ code: 'NOT_FOUND', error: `No bucket d-${uuid} was found.` })
    }
    res.status(502).json({ code: 'PROXY', error: 'Could not read the bucket from the EBRAINS data-proxy. Please try again later.' })
  }
})

export default router
