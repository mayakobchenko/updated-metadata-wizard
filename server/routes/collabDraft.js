// Draft of the wizard in the Collab drive of the dataset (opt-in autosave).
//   GET  /api/drive/draft/info?datasetVersionId=…   -> { exists, mtime, size }
//   POST /api/drive/draft/save  { datasetVersionId, payload } -> { savedAt }
//   GET  /api/drive/draft/load?datasetVersionId=…   -> { payload }
// Runs with the token of the logged-in user (never a shared token).
import express from 'express'
import logger from '../logger.js'
import { getUserAccessToken } from './userSessions.js'
import { saveDraft, draftInfo, loadDraft, putFile, getFileBuffer, deleteFile, FILES_DIR, DriveError } from '../KG_utils/driveDraft.js'

const router = express.Router()
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function guard(req, res, id, fn) {
  if (!UUID.test(String(id || ''))) return res.status(400).json({ code: 'BAD_ID', error: 'The dataset version ID is missing or not valid, so the draft cannot be kept in the Collab drive.' })
  let token = null
  try { token = await getUserAccessToken(req) } catch { /* treated as not logged in */ }
  if (!token) return res.status(401).json({ code: 'SESSION_EXPIRED', error: 'Your EBRAINS login has ended. Please log in again (in a new browser tab if you want to keep this page).' })
  res.set('Cache-Control', 'no-store')
  try {
    return res.json(await fn(token, String(id).toLowerCase()))
  } catch (e) {
    if (e instanceof DriveError) {
      logger.warn(`collab draft ${e.code} for d-${id}: ${e.message}`)
      return res.status(e.status).json({ code: e.code, error: e.message })
    }
    logger.error(`collab draft failed for d-${id}: ${e.message}`)
    return res.status(500).json({ code: 'DRIVE_ERROR', error: 'The draft could not be saved or read in the Collab drive.' })
  }
}

router.get('/draft/info', (req, res) => guard(req, res, req.query.datasetVersionId, draftInfo))
router.get('/draft/load', (req, res) => guard(req, res, req.query.datasetVersionId, async (t, id) => ({ payload: await loadDraft(t, id) })))
router.post('/draft/save', (req, res) => {
  const payload = req.body?.payload
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return res.status(400).json({ code: 'BAD_DRAFT', error: 'Nothing to save.' })
  return guard(req, res, req.body?.datasetVersionId, (t, id) => saveDraft(t, id, JSON.stringify(payload, null, 2)))
})

// Figures and tables: images as separate files in /metadata_wizard_draft_files/, the rest in figures.json there.
const FID = /^[A-Za-z0-9]{1,40}$/
const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg' }
const MIME = { png: 'image/png', jpg: 'image/jpeg' }
const dir = '/' + FILES_DIR

router.post('/draft/figures/image', (req, res) => {
  const { id, type, dataBase64 } = req.body || {}
  const ext = EXT[type]
  if (!FID.test(String(id || '')) || !ext || typeof dataBase64 !== 'string') return res.status(400).json({ code: 'BAD_FIGURE', error: 'The figure could not be read.' })
  const buf = Buffer.from(dataBase64, 'base64')
  if (!buf.length || buf.length > 6 * 1024 * 1024) return res.status(400).json({ code: 'BAD_FIGURE', error: 'The figure is empty or too large.' })
  return guard(req, res, req.body?.datasetVersionId, async (t, dv) => { await putFile(t, dv, dir, `${id}.${ext}`, buf, type); return { file: `${id}.${ext}` } })
})
router.post('/draft/figures/index', (req, res) => {
  const index = req.body?.index
  if (!index || typeof index !== 'object' || !Array.isArray(index.items)) return res.status(400).json({ code: 'BAD_FIGURE', error: 'Nothing to save.' })
  return guard(req, res, req.body?.datasetVersionId, (t, dv) => putFile(t, dv, dir, 'figures.json', JSON.stringify(index, null, 2)))
})
router.post('/draft/figures/delete', (req, res) => {
  const file = String(req.body?.file || '')
  if (!/^[A-Za-z0-9]{1,40}\.(png|jpg)$/.test(file)) return res.status(400).json({ code: 'BAD_FIGURE', error: 'Not a figure file.' })
  return guard(req, res, req.body?.datasetVersionId, (t, dv) => deleteFile(t, dv, `${dir}/${file}`))
})
router.get('/draft/figures/index', (req, res) => guard(req, res, req.query.datasetVersionId, async (t, dv) => {
  const buf = await getFileBuffer(t, dv, `${dir}/figures.json`)
  if (!buf) return { index: null }
  try { return { index: JSON.parse(buf.toString('utf8')) } } catch { throw new DriveError('BAD_DRAFT', 'The figures file in the Collab drive is not valid JSON.', 422) }
}))
router.get('/draft/figures/image', (req, res) => {
  const file = String(req.query.file || '')
  const m = file.match(/^[A-Za-z0-9]{1,40}\.(png|jpg)$/)
  if (!m) return res.status(400).json({ code: 'BAD_FIGURE', error: 'Not a figure file.' })
  return guard(req, res, req.query.datasetVersionId, async (t, dv) => {
    const buf = await getFileBuffer(t, dv, `${dir}/${file}`)
    if (!buf) throw new DriveError('NO_DRAFT', 'A figure file is missing in the Collab drive.', 404)
    return { type: MIME[m[1]], dataBase64: buf.toString('base64') }
  })
})

export default router
