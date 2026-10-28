// Save / load the wizard draft as ONE json file in the Collab drive (Seafile) of the dataset.
// The library of a dataset has the name of its Collab: d-<datasetVersionId>.
// Steps (as confirmed with the curators' scripts):
//   1. exchange the user's EBRAINS token (scope collab.drive) for a drive token:  GET /api2/account/token/
//   2. find the library by name:                                                  GET /api2/repos/
//   3. upload: get an upload link (GET /api2/repos/<id>/upload-link/?p=/) and POST the file as multipart
//      (parent_dir=/, replace=1)
//   4. load:   GET /api2/repos/<id>/file/detail/?p=<file> (exists? mtime) and GET /api2/repos/<id>/file/?p=<file> (download link)
// Everything runs with the token of the person using the wizard, so the drive decides what they may do.
import crypto from 'crypto'

const BASE = process.env.DRIVE_BASE || 'https://drive.ebrains.eu'
export const DRAFT_FILE = 'metadata_wizard_draft.json'

export class DriveError extends Error {
  constructor(code, message, status = 502) { super(message); this.code = code; this.status = status }
}

const driveTokens = new Map()   // sha256(ebrains token) -> { token, exp }
const DRIVE_TOKEN_TTL_MS = 5 * 60 * 1000

async function call(url, init = {}, what = 'The Collab drive') {
  let res
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(30000) })
  } catch (e) {
    throw new DriveError('DRIVE_UNREACHABLE', `${what} could not be reached (${e.message}).`)
  }
  return res
}

export async function getDriveToken(ebrainsToken, { fresh = false } = {}) {
  const key = crypto.createHash('sha256').update(ebrainsToken).digest('hex')
  const hit = driveTokens.get(key)
  if (!fresh && hit && hit.exp > Date.now()) return hit.token
  const res = await call(`${BASE}/api2/account/token/`, { headers: { Authorization: `Bearer ${ebrainsToken}`, Accept: 'text/plain' } })
  if (res.status === 401 || res.status === 403) {
    throw new DriveError('NO_DRIVE_ACCESS', 'Your EBRAINS login does not give access to the Collab drive. Please log out and log in again.', 403)
  }
  if (!res.ok) throw new DriveError('DRIVE_ERROR', `The Collab drive answered ${res.status} when asked for access.`)
  const token = (await res.text()).trim().replace(/^"(.*)"$/, '$1')
  if (!token) throw new DriveError('NO_DRIVE_ACCESS', 'The Collab drive did not give an access token.', 403)
  driveTokens.set(key, { token, exp: Date.now() + DRIVE_TOKEN_TTL_MS })
  return token
}

// Seafile expects "Token <t>"; the curators' script used "Bearer <t>". Try the standard form first.
async function authed(url, driveToken, init = {}) {
  const headers = { Accept: 'application/json', ...(init.headers || {}) }
  let res = await call(url, { ...init, headers: { ...headers, Authorization: `Token ${driveToken}` } })
  if (res.status === 401) res = await call(url, { ...init, headers: { ...headers, Authorization: `Bearer ${driveToken}` } })
  return res
}

export async function findLibrary(driveToken, name) {
  const res = await authed(`${BASE}/api2/repos/`, driveToken)
  if (res.status === 401 || res.status === 403) throw new DriveError('NO_DRIVE_ACCESS', 'The Collab drive did not accept your login. Please log out and log in again.', 403)
  if (!res.ok) throw new DriveError('DRIVE_ERROR', `The Collab drive answered ${res.status} when listing your libraries.`)
  const libs = await res.json().catch(() => [])
  const lib = Array.isArray(libs) ? libs.find(l => l.name === name) : null
  if (!lib) {
    throw new DriveError('NO_LIBRARY', `No Collab drive named ${name} was found among the libraries you can access. You must be a member of that Collab.`, 404)
  }
  return lib
}

const quoted = (t) => String(t).trim().replace(/^"(.*)"$/, '$1')

export async function saveDraft(ebrainsToken, datasetVersionId, jsonText) {
  const driveToken = await getDriveToken(ebrainsToken)
  const lib = await findLibrary(driveToken, `d-${datasetVersionId}`)
  const linkRes = await authed(`${BASE}/api2/repos/${lib.id}/upload-link/?p=/`, driveToken)
  if (linkRes.status === 403) throw new DriveError('NO_WRITE', `You have no write access to the Collab drive d-${datasetVersionId}.`, 403)
  if (!linkRes.ok) throw new DriveError('DRIVE_ERROR', `The Collab drive answered ${linkRes.status} when asked for an upload link.`)
  const link = quoted(await linkRes.text())
  const form = new FormData()
  form.append('parent_dir', '/')
  form.append('replace', '1')
  form.append('file', new Blob([jsonText], { type: 'application/json' }), DRAFT_FILE)
  const up = await authed(`${link}${link.includes('?') ? '&' : '?'}ret-json=1`, driveToken, { method: 'POST', body: form })
  if (up.status === 403) throw new DriveError('NO_WRITE', `You have no write access to the Collab drive d-${datasetVersionId}.`, 403)
  if (!up.ok) {
    const body = await up.text().catch(() => '')
    throw new DriveError('DRIVE_ERROR', `The Collab drive refused the upload (${up.status}${body ? `: ${body.slice(0, 120)}` : ''}).`)
  }
  return { savedAt: new Date().toISOString() }
}

// { exists:false } or { exists:true, mtime (ISO), size }
export async function draftInfo(ebrainsToken, datasetVersionId) {
  const driveToken = await getDriveToken(ebrainsToken)
  let lib
  try { lib = await findLibrary(driveToken, `d-${datasetVersionId}`) } catch (e) {
    if (e.code === 'NO_LIBRARY') return { exists: false, library: false }
    throw e
  }
  const res = await authed(`${BASE}/api2/repos/${lib.id}/file/detail/?p=${encodeURIComponent('/' + DRAFT_FILE)}`, driveToken)
  if (res.status === 404) return { exists: false, library: true }
  if (!res.ok) throw new DriveError('DRIVE_ERROR', `The Collab drive answered ${res.status} when looking for the draft.`)
  const d = await res.json().catch(() => ({}))
  return { exists: true, library: true, mtime: d.mtime ? new Date(d.mtime * 1000).toISOString() : null, size: d.size ?? null }
}

export async function loadDraft(ebrainsToken, datasetVersionId) {
  const driveToken = await getDriveToken(ebrainsToken)
  const lib = await findLibrary(driveToken, `d-${datasetVersionId}`)
  const linkRes = await authed(`${BASE}/api2/repos/${lib.id}/file/?p=${encodeURIComponent('/' + DRAFT_FILE)}&reuse=1`, driveToken)
  if (linkRes.status === 404) throw new DriveError('NO_DRAFT', 'There is no draft in the Collab drive yet.', 404)
  if (!linkRes.ok) throw new DriveError('DRIVE_ERROR', `The Collab drive answered ${linkRes.status} when asked for the draft.`)
  const fileRes = await call(quoted(await linkRes.text()), {}, 'The draft file')
  if (!fileRes.ok) throw new DriveError('DRIVE_ERROR', `The draft file could not be downloaded (${fileRes.status}).`)
  const text = await fileRes.text()
  try { return JSON.parse(text) } catch { throw new DriveError('BAD_DRAFT', 'The draft file in the Collab drive is not valid JSON.', 422) }
}
