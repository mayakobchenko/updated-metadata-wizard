// Draft of the wizard in the Collab drive of the dataset (opt-in autosave).
//   GET  /api/drive/draft/info?datasetVersionId=…   -> { exists, mtime, size }
//   POST /api/drive/draft/save  { datasetVersionId, payload } -> { savedAt }
//   GET  /api/drive/draft/load?datasetVersionId=…   -> { payload }
// Runs with the token of the logged-in user (never a shared token).
import express from 'express'
import logger from '../logger.js'
import { getUserAccessToken } from './userSessions.js'
import { saveDraft, draftInfo, loadDraft, DriveError } from '../KG_utils/driveDraft.js'

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

export default router
