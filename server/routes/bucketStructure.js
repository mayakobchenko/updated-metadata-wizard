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
// Very large buckets (tens of thousands of files) cannot be listed within the time a web request may take, and a
// tree of that many names is not useful anyway. Listing stops at the first limit that is reached and the answer
// is marked as partial (the researcher is told).
const MAX_FILES = Number(process.env.BUCKET_MAX_FILES) || 50000
const TIME_BUDGET_MS = Number(process.env.BUCKET_TIME_BUDGET_MS) || 30000

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

// Folder-by-folder listing (delimiter "/"). The data-proxy spends about 40 ms per FILE object but folders are
// cheap, and requests run in parallel, so the bucket is walked breadth-first with several folders read at once.
//   - first pass: the first page of every folder (folders found on the way are queued),
//   - second pass: further pages of folders with many entries, as long as time and file limits allow.
// A bucket that is read completely gives exact results. Otherwise the answer is marked partial and says which
// folders were only sampled (`partialDirs`) or not opened at all (`unreadDirs`).
const CONCURRENCY = 6
const FIRST_PAGE = 100
const NEXT_PAGE = 200

async function walkBucket(endpoint, token, deadline) {
  const objects = []
  const partialDirs = new Set()
  const unreadDirs = new Set()
  let useDelimiter = true
  let stop = ''          // why the walk stopped early: 'count' | 'time' | 'error'
  let failure = null
  const first = [{ prefix: '', marker: '' }]
  const more = []
  let active = 0
  let readAny = false

  const page = async (task, limit) => {
    const qs = new URLSearchParams({ limit: String(limit) })
    if (useDelimiter) qs.set('delimiter', '/')
    if (task.prefix) qs.set('prefix', task.prefix)
    if (task.marker) qs.set('marker', task.marker)
    try {
      return await proxyGet(`${endpoint}?${qs}`, token, deadline)
    } catch (e) {
      if ([400, 422].includes(e.status) && useDelimiter && !readAny) { useDelimiter = false; return page(task, limit) }
      throw e
    }
  }

  const work = async () => {
    for (;;) {
      if (stop || failure) return
      if (objects.length >= MAX_FILES) { stop = 'count'; return }
      if (Date.now() >= deadline) { stop = 'time'; return }
      const task = first.shift() || more.shift()
      if (!task) {
        if (!active) return
        await sleep(40); continue
      }
      active++
      try {
        const limit = task.marker ? NEXT_PAGE : FIRST_PAGE
        const body = await page(task, limit)
        const entries = body.objects || []
        readAny = true
        for (const o of entries) {
          if (o.subdir) first.push({ prefix: String(o.subdir), marker: '' })
          else if (o.name && !String(o.name).endsWith('/')) objects.push({ name: o.name, bytes: Number(o.bytes) || 0 })
        }
        if (entries.length >= limit) {
          const last = entries[entries.length - 1]
          const marker = String(last.subdir || last.name || '')
          if (marker && marker !== task.marker) more.push({ prefix: task.prefix, marker })
          else partialDirs.add(task.prefix)
        }
      } catch (e) {
        if (readAny && (e.status === 0 || TRANSIENT.includes(e.status))) { stop = stop || 'error'; unreadDirs.add(task.prefix) }
        else failure = e
      } finally { active-- }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, work))
  if (failure) throw failure
  // whatever is still queued was not read (or only in part)
  for (const t of first) unreadDirs.add(t.prefix)
  for (const t of more) partialDirs.add(t.prefix)
  if (!stop && (first.length || more.length)) stop = 'time'
  const dirs = (set) => [...set].map(p => p.replace(/\/$/, ''))
  return { objects, truncated: stop, partialDirs: dirs(partialDirs), unreadDirs: dirs(unreadDirs) }
}

// The bucket of a dataset is d-<uuid>; `datasets/<uuid>` only exists for released datasets (and needs several
// seconds to say 404 for the others), so the bucket address is tried first.
async function listAll(uuid, token) {
  const deadline = Date.now() + TIME_BUDGET_MS
  const endpoints = [`${BASE}/buckets/d-${uuid}`, `${BASE}/datasets/${uuid}`]
  let lastErr
  for (const endpoint of endpoints) {
    try {
      return await walkBucket(endpoint, token, deadline)
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
  // data organisation standards ticked in Dataset part 1 (e.g. BIDS): only used to describe the structure
  const standards = Array.isArray(req.body?.standards) ? req.body.standards.filter(x => typeof x === 'string').slice(0, 20) : []
  // a token pasted by the user wins; otherwise the token of the logged-in user
  const pasted = typeof req.body?.token === 'string' ? req.body.token.trim().replace(/^Bearer\s+/i, '') : ''
  const token = pasted || await getUserAccessToken(req)
  if (!token) {
    return res.status(401).json({ code: 'NO_TOKEN', error: 'Your login session has no usable EBRAINS token. Please log in again, or paste a token below.' })
  }
  try {
    const { objects, truncated, partialDirs, unreadDirs } = await listAll(uuid, token)
    if (!objects.length && !partialDirs.length && !unreadDirs.length) {
      return res.status(404).json({ code: 'EMPTY', error: `The bucket d-${uuid} is empty or has no files yet.` })
    }
    const result = describeBucket(objects, `d-${uuid}`, { partial: !!truncated, partialDirs, unreadDirs, standards })
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
