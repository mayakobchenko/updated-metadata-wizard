// What the Knowledge Graph already holds for a dataset version, as wizard form data.
//   GET /api/kgcollab/content?datasetVersionId=<uuid>  -> { data, summary, notes, counts }
// Read-only, with the token of the logged-in user (never a shared token).
import express from 'express'
import logger from '../logger.js'
import { getUserAccessToken } from './userSessions.js'
import { fetchCollabContent, KgReadError } from '../KG_utils/kgCollabContent.js'

const router = express.Router()
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

router.get('/content', async (req, res) => {
  const id = String(req.query.datasetVersionId || '')
  if (!UUID.test(id)) return res.status(400).json({ code: 'BAD_ID', error: 'The dataset version ID is missing or not valid.' })
  let token = null
  try { token = await getUserAccessToken(req) } catch { /* treated as not logged in */ }
  if (!token) return res.status(401).json({ code: 'SESSION_EXPIRED', error: 'Your EBRAINS login has ended. Please log in again.' })
  res.set('Cache-Control', 'no-store')
  try {
    const result = await fetchCollabContent(token, id)
    logger.info(`kg collab content for ${id}: ${result.counts.subjects} subjects, ${result.counts.authors} authors`)
    res.json(result)
  } catch (e) {
    if (e instanceof KgReadError) {
      logger.warn(`kg collab content ${e.code} for ${id}: ${e.message}`)
      return res.status(e.status).json({ code: e.code, error: e.message })
    }
    logger.error(`kg collab content failed for ${id}: ${e.stack || e.message}`)
    res.status(500).json({ code: 'KG_ERROR', error: 'The content of the Knowledge Graph could not be read.' })
  }
})

export default router
