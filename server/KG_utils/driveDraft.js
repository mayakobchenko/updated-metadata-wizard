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
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    const snippet = body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160)
    throw new DriveError('DRIVE_TOKEN_ERROR', `The Collab drive answered ${res.status} when asked for access${snippet ? ` (${snippet})` : ''}.`)
  }
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

const libCache = new Map()   // driveToken + name -> { lib, exp }
export async function findLibrary(driveToken, name) {
  const ck = `${driveToken}|${name}`
  const c = libCache.get(ck)
  if (c && c.exp > Date.now()) return c.lib
  const res = await authed(`${BASE}/api2/repos/`, driveToken)
  if (res.status === 401 || res.status === 403) throw new DriveError('NO_DRIVE_ACCESS', 'The Collab drive did not accept your login. Please log out and log in again.', 403)
  if (!res.ok) throw new DriveError('DRIVE_ERROR', `The Collab drive answered ${res.status} when listing your libraries.`)
  const libs = await res.json().catch(() => [])
  const lib = Array.isArray(libs) ? libs.find(l => l.name === name) : null
  if (!lib) {
    throw new DriveError('NO_LIBRARY', `No Collab drive named ${name} was found among the libraries you can access. You must be a member of that Collab.`, 404)
  }
  libCache.set(ck, { lib, exp: Date.now() + DRIVE_TOKEN_TTL_MS })
  return lib
}

// What the EBRAINS token says about itself (scope, audience, age) for the log. The token itself is never logged.
export function describeToken(jwt) {
  try {
    const p = JSON.parse(Buffer.from(String(jwt).split('.')[1], 'base64url').toString('utf8'))
    return `scope="${p.scope || ''}" aud=${JSON.stringify(p.aud || '')} azp=${p.azp || ''} issued ${p.iat ? Math.round(Date.now() / 1000 - p.iat) : '?'}s ago`
  } catch { return 'token not readable' }
}

const quoted = (t) => String(t).trim().replace(/^"(.*)"$/, '$1')

export const FILES_DIR = 'metadata_wizard_draft_files'
const dirsKnown = new Set()   // library id + folder, already checked or created

// Seafile does NOT refuse "mkdir" on an existing folder: it creates "name (1)", "name (2)" ... So look first.
async function ensureDir(driveToken, lib, dir) {
  if (dir === '/') return
  const key = `${lib.id}|${dir}`
  if (dirsKnown.has(key)) return
  const look = await authed(`${BASE}/api2/repos/${lib.id}/dir/?p=${encodeURIComponent(dir)}`, driveToken)
  if (look.ok) { dirsKnown.add(key); return }
  if (look.status !== 404) throw new DriveError('DRIVE_ERROR', `The Collab drive answered ${look.status} when looking for the folder ${dir}.`)
  const res = await authed(`${BASE}/api2/repos/${lib.id}/dir/?p=${encodeURIComponent(dir)}`, driveToken, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'operation=mkdir',
  })
  if (res.status === 403) throw new DriveError('NO_WRITE', `You have no write access to the Collab drive ${lib.name}.`, 403)
  if (!res.ok) throw new DriveError('DRIVE_ERROR', `The Collab drive answered ${res.status} when creating the folder ${dir}.`)
  dirsKnown.add(key)
}

// Writes (replaces) one file in a folder of the dataset's Collab drive. dir is '/' or '/name'.
export async function putFile(ebrainsToken, datasetVersionId, dir, fileName, content, mime = 'application/json') {
  const driveToken = await getDriveToken(ebrainsToken)
  const lib = await findLibrary(driveToken, `d-${datasetVersionId}`)
  await ensureDir(driveToken, lib, dir)
  const linkRes = await authed(`${BASE}/api2/repos/${lib.id}/upload-link/?p=${encodeURIComponent(dir)}`, driveToken)
  if (linkRes.status === 403) throw new DriveError('NO_WRITE', `You have no write access to the Collab drive d-${datasetVersionId}.`, 403)
  if (!linkRes.ok) throw new DriveError('DRIVE_ERROR', `The Collab drive answered ${linkRes.status} when asked for an upload link.`)
  const link = quoted(await linkRes.text())
  const form = new FormData()
  form.append('parent_dir', dir)
  form.append('replace', '1')
  form.append('file', new Blob([content], { type: mime }), fileName)
  const up = await authed(`${link}${link.includes('?') ? '&' : '?'}ret-json=1`, driveToken, { method: 'POST', body: form })
  if (up.status === 403) throw new DriveError('NO_WRITE', `You have no write access to the Collab drive d-${datasetVersionId}.`, 403)
  if (!up.ok) {
    const body = await up.text().catch(() => '')
    throw new DriveError('DRIVE_ERROR', `The Collab drive refused the upload (${up.status}${body ? `: ${body.slice(0, 120)}` : ''}).`)
  }
  return { savedAt: new Date().toISOString() }
}

export const saveDraft = (t, id, jsonText) => putFile(t, id, '/', DRAFT_FILE, jsonText)

// Reads one file as a Buffer, or null when it does not exist.
export async function getFileBuffer(ebrainsToken, datasetVersionId, path) {
  const driveToken = await getDriveToken(ebrainsToken)
  const lib = await findLibrary(driveToken, `d-${datasetVersionId}`)
  const linkRes = await authed(`${BASE}/api2/repos/${lib.id}/file/?p=${encodeURIComponent(path)}&reuse=1`, driveToken)
  if (linkRes.status === 404) return null
  if (!linkRes.ok) throw new DriveError('DRIVE_ERROR', `The Collab drive answered ${linkRes.status} when asked for ${path}.`)
  const fileRes = await call(quoted(await linkRes.text()), {}, 'The file')
  if (!fileRes.ok) throw new DriveError('DRIVE_ERROR', `The file ${path} could not be downloaded (${fileRes.status}).`)
  return Buffer.from(await fileRes.arrayBuffer())
}

export async function deleteFile(ebrainsToken, datasetVersionId, path) {
  const driveToken = await getDriveToken(ebrainsToken)
  const lib = await findLibrary(driveToken, `d-${datasetVersionId}`)
  const res = await authed(`${BASE}/api2/repos/${lib.id}/file/?p=${encodeURIComponent(path)}`, driveToken, { method: 'DELETE' })
  if (res.status === 403) throw new DriveError('NO_WRITE', `You have no write access to the Collab drive d-${datasetVersionId}.`, 403)
  if (!res.ok && res.status !== 404) throw new DriveError('DRIVE_ERROR', `The Collab drive answered ${res.status} when deleting ${path}.`)
  return { deleted: true }
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
