import express           from 'express'
import dotenv            from 'dotenv'
import { spawn }         from 'child_process'
import path              from 'path'
import { fileURLToPath } from 'url'
import { writeFile }     from 'fs/promises'
import nodemailer        from 'nodemailer'
import tokenFunctions, { SessionExpiredError } from './tokenManager.js'
import logger            from '../logger.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)
const router     = express.Router()

router.get('/hello',      sayHello)
router.post('/runpython', runPythonScript)

// ── email transport — configure via env vars ──────────────────────────────────

const mailer = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: process.env.GMAIL_USER ? {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  } : undefined,
})

async function sendFailureNotification({ datasetTitle, datasetVersionId, errorMessage, stderr, userEmail }) {
  const to      = 'maya.kobchenko@medisin.uio.no'
  const from    = process.env.GMAIL_SENDER
  const subject = `[Metadata Wizard] Upload FAILED — ${datasetTitle || datasetVersionId || 'unknown dataset'}`

  const body = `
A metadata upload to the EBRAINS Knowledge Graph has FAILED.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dataset title:      ${datasetTitle || '(not set)'}
Dataset version ID: ${datasetVersionId || '(not set)'}
User email:         ${userEmail || '(not set)'}
Timestamp:          ${new Date().toISOString()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Error:
${errorMessage}

Python stderr (last 2000 chars):
${(stderr || '').slice(-2000)}
  `.trim()

  try {
    await mailer.sendMail({ from, to, subject, text: body })
    logger.info(`Failure notification sent to ${to}`)
  } catch (mailErr) {
    // never let email failure break the response flow
    logger.error(`Could not send failure notification email: ${mailErr.message}`)
  }
}

async function sayHello(req, res) {
  res.json({ message: 'Hello from python uploading route' })
}

async function runPythonScript(req, res) {
  const jsonData        = req.body
  const jsonFilePath    = path.join(__dirname, 'data.json')
  const datasetTitle    = jsonData?.dataset1?.dataTitle    || ''
  const datasetVersionId = jsonData?.datasetVersionId      || ''
  const userEmail       = jsonData?.contactperson?.email   || jsonData?.custodian?.email || ''
  const submissionStart = Date.now()

  logger.info(`[submission] START — dataset: "${datasetTitle}" | dsv: ${datasetVersionId} | user: ${userEmail}`)

  // ── 1. write form data to disk ──────────────────────────────────────────────
  try {
    await writeFile(jsonFilePath, JSON.stringify(jsonData, null, 2))
  } catch (writeError) {
    logger.error(`[submission] JSON write failed: ${writeError.message}`)
    return res.status(500).json({ error: 'Failed to write JSON file' })
  }

  // ── 2. get KG token ─────────────────────────────────────────────────────────
  let kg_token
  try {
    kg_token = await tokenFunctions.getWorkingToken()
  } catch (err) {
    const isExpired = err instanceof SessionExpiredError

    logger.warn(`[submission] Token error — expired=${isExpired} — ${err.message}`)

    if (isExpired) {
      // return a distinct 401 with a machine-readable code the frontend can act on
      return res.status(401).json({
        error:        err.message,
        code:         'SESSION_EXPIRED',   // ← frontend checks this
        datasetTitle,
        datasetVersionId,
      })
    }
    return res.status(500).json({ error: `Token error: ${err.message}` })
  }

  if (!kg_token) {
    return res.status(401).json({
      error: 'Could not obtain a valid token. Please reload the page.',
      code:  'SESSION_EXPIRED',
    })
  }

  // ── 3. run Python script ─────────────────────────────────────────────────────
  const scriptPath = path.join(__dirname, './python_scripts/python_upload_json.py')
  let stdout = ''
  let stderr = ''

  const py = spawn('python3', [scriptPath, kg_token, jsonFilePath])

  py.stdout.on('data', (chunk) => { stdout += chunk.toString() })
  py.stderr.on('data', (chunk) => {
    const text = chunk.toString()
    stderr += text
    logger.info(`[python stderr] ${text.trim()}`)
  })

  py.on('error', (spawnError) => {
    logger.error(`[submission] spawn error: ${spawnError.message}`)
    if (!res.headersSent) {
      sendFailureNotification({ datasetTitle, datasetVersionId, userEmail,
        errorMessage: `Failed to start Python: ${spawnError.message}`, stderr })
      res.status(500).json({ error: `Failed to start Python: ${spawnError.message}` })
    }
  })

  py.on('close', async (code) => {
    const elapsed = ((Date.now() - submissionStart) / 1000).toFixed(1)

    // ── parse stdout ──────────────────────────────────────────────────────────
    let parsed = null
    try {
      parsed = JSON.parse(stdout.trim())
    } catch {
      const errMsg = 'Python script produced invalid output.'
      logger.error(`[submission] FAILED (${elapsed}s) — ${errMsg} stdout: "${stdout.slice(0, 200)}"`)
      if (!res.headersSent) {
        await sendFailureNotification({ datasetTitle, datasetVersionId, userEmail,
          errorMessage: errMsg, stderr })
        res.status(500).json({ error: errMsg, detail: stdout.slice(0, 500) })
      }
      return
    }

    // ── explicit Python-level error ───────────────────────────────────────────
    if (parsed.error) {
      logger.error(`[submission] FAILED (${elapsed}s) — Python error: ${parsed.error}`)
      if (!res.headersSent) {
        await sendFailureNotification({ datasetTitle, datasetVersionId, userEmail,
          errorMessage: parsed.error, stderr })
        res.status(500).json({ error: parsed.error, detail: parsed.detail || '' })
      }
      return
    }

    // ── non-zero exit ─────────────────────────────────────────────────────────
    if (code !== 0) {
      const errMsg = `Python script exited with code ${code}.`
      logger.error(`[submission] FAILED (${elapsed}s) — ${errMsg}`)
      if (!res.headersSent) {
        await sendFailureNotification({ datasetTitle, datasetVersionId, userEmail,
          errorMessage: errMsg, stderr })
        res.status(500).json({ error: errMsg })
      }
      return
    }

    // ── success ───────────────────────────────────────────────────────────────
    logger.info(`[submission] SUCCESS (${elapsed}s) — dataset: "${datasetTitle}" | dsv: ${datasetVersionId}`)
    if (!res.headersSent) {
      res.status(200).json(parsed)
    }
  })
}

export default router