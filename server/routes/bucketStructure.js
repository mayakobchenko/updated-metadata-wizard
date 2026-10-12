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
const MAX_PAGES = 50

class ProxyError extends Error {
  constructor(status, message) { super(message); this.status = status }
}

async function proxyGet(url, token) {
  const res = await fetch(url, { headers: { accept: 'application/json', Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new ProxyError(res.status, `data-proxy answered ${res.status} ${res.statusText}`)
  return res.json()
}

// Pages with marker = last object name until an empty page comes back.
// `datasets/<uuid>` is tried first (the endpoint the curators verified); if it
// does not exist for this id, the `buckets/d-<uuid>` endpoint is used.
async function listAll(uuid, token) {
  const endpoints = [`${BASE}/datasets/${uuid}`, `${BASE}/buckets/d-${uuid}`]
  let lastErr
  for (const endpoint of endpoints) {
    try {
      const objects = []
      let pageSize = PAGE_SIZES[0]
      let marker = ''
      let truncated = false
      for (let page = 0; ; page++) {
        const qs = new URLSearchParams({ limit: String(pageSize) })
        if (marker) qs.set('marker', marker)
        let body
        try {
          body = await proxyGet(`${endpoint}?${qs}`, token)
        } catch (e) {
          if ([400, 422].includes(e.status) && pageSize !== PAGE_SIZES[1]) { pageSize = PAGE_SIZES[1]; page--; continue }
          throw e
        }
        const items = (body.objects || []).filter(o => o.name && !o.subdir)
        if (!items.length) break
        for (const o of items) objects.push({ name: o.name, bytes: Number(o.bytes) || 0 })
        const next = (body.objects || [])[(body.objects || []).length - 1].name
        if (next === marker) break
        marker = next
        if (page + 1 >= MAX_PAGES * 10) { truncated = true; break }
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
    const result = describeBucket(objects, `d-${uuid}`)
    logger.info(`bucket structure: d-${uuid} ${objects.length} files${truncated ? ' (truncated)' : ''}`)
    res.json({ bucket: `d-${uuid}`, truncated, ...result })
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
