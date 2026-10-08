import express           from 'express'
import dotenv            from 'dotenv'
import { spawn }         from 'child_process'
import path              from 'path'
import { fileURLToPath } from 'url'
import { writeFile, unlink } from 'fs/promises'
import { randomUUID }    from 'crypto'
import nodemailer        from 'nodemailer'
import tokenFunctions, { SessionExpiredError } from './tokenManager.js'
import logger            from '../logger.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)
const router     = express.Router()

// ── in-memory job store ─────────────────────────────────────────────────────
// The KG upload can take several minutes (sometimes over an hour for very
// large submissions — many sequential calls per subject/author/
// contribution). Holding one HTTP request open that whole time is fragile —
// any proxy/ingress/browser with a shorter idle timeout than the upload
// takes will kill the connection while the script keeps running
// server-side, oblivious that nobody's listening anymore (this is exactly
// what caused "Failed to fetch" while Rancher logs showed the submission
// completing normally).
//
// Instead: POST /runpython starts the job and returns a jobId immediately;
// the frontend polls GET /runpython/status/:jobId every few seconds. Each
// individual poll is fast, so it never runs into anyone's idle timeout.
//
// NOTE: this store is in-memory and per-process. If the pod restarts or a
// new deployment rolls out mid-upload, in-flight jobs are lost and polling
// will get a 404 for that jobId. Acceptable for a low-traffic internal tool
// with a single replica; would need a persistent store (file/DB) to survive
// restarts if that ever becomes a real risk.
const jobs = new Map()
const JOB_RETENTION_MS = 30 * 60 * 1000 // keep finished jobs around 30 min for late polls

function scheduleJobCleanup(jobId) {
  const t = setTimeout(() => jobs.delete(jobId), JOB_RETENTION_MS)
  t.unref?.() // don't keep the process alive just for this
}

// ── concurrency guard ────────────────────────────────────────────────────────
// Maps datasetVersionId -> the jobId currently running for it. Without this,
// a confused double-click, an accidental second tab, or (before the polling
// fix above) a premature "Failed to fetch" prompting a retry, could start
// two full Python runs for the same dataset at the same time. Several
// entity types in the upload script have no existence check before
// creating (by design — natural-key lookups aren't free), so two concurrent
// runs each independently create their own copy: this is exactly what
// caused 16 SubjectGroup/TissueSampleCollection records instead of 8 in a
// real incident. If a job is already running for a given datasetVersionId,
// a new submission attempt is handed the existing jobId to poll instead of
// starting a second Python process.
const activeJobByDataset = new Map()

router.get('/hello',                       sayHello)
router.post('/runpython',                  runPythonScript)
router.get('/runpython/status/:jobId',     getJobStatus)

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
  const datasetTitle    = jsonData?.dataset1?.dataTitle    || ''
  const datasetVersionId = jsonData?.datasetVersionId      || ''
  const userEmail       = jsonData?.contactperson?.email   || jsonData?.custodian?.email || ''
  const submissionStart = Date.now()

  // ── 0. concurrency guard — check AND register in one synchronous step,
  // before any `await`. Splitting "check" and "register" across an await
  // point (as an earlier version of this did) allows two near-simultaneous
  // requests to both pass the check before either one registers — a
  // classic check-then-act race. Doing it synchronously here closes that
  // window entirely: Node's single-threaded event loop guarantees this
  // block runs to completion before the other request's handler can run.
  let jobId
  if (datasetVersionId) {
    const existingJobId = activeJobByDataset.get(datasetVersionId)
    const existingJob    = existingJobId ? jobs.get(existingJobId) : null
    if (existingJob && (existingJob.status === 'pending' || existingJob.status === 'running')) {
      logger.info(`[submission] dsv ${datasetVersionId} already has job ${existingJobId} in progress — reusing it instead of starting a second one`)
      return res.status(202).json({ jobId: existingJobId, reused: true })
    }
    jobId = randomUUID()
    // 'pending' placeholder registered immediately so a third near-simultaneous
    // request also sees this dataset as locked, even before step 1/2 finish.
    activeJobByDataset.set(datasetVersionId, jobId)
    jobs.set(jobId, { status: 'pending', startedAt: submissionStart })
  } else {
    jobId = randomUUID()
  }

  const releaseDatasetLock = () => {
    if (datasetVersionId && activeJobByDataset.get(datasetVersionId) === jobId) {
      activeJobByDataset.delete(datasetVersionId)
    }
  }

  const jsonFilePath = path.join(__dirname, `data-${jobId}.json`)
  logger.info(`[submission] START — job: ${jobId} | dataset: "${datasetTitle}" | dsv: ${datasetVersionId} | user: ${userEmail}`)

  // ── 1. write form data to disk ──────────────────────────────────────────────
  try {
    await writeFile(jsonFilePath, JSON.stringify(jsonData, null, 2))
  } catch (writeError) {
    logger.error(`[submission] JSON write failed: ${writeError.message}`)
    jobs.delete(jobId)
    releaseDatasetLock()
    return res.status(500).json({ error: 'Failed to write JSON file' })
  }

  // ── 2. get KG token ─────────────────────────────────────────────────────────
  // Kept synchronous (not part of the background job) so an expired session
  // is reported back to the frontend immediately, not after a poll delay.
  let kg_token
  try {
    kg_token = await tokenFunctions.getWorkingToken()
  } catch (err) {
    const isExpired = err instanceof SessionExpiredError

    logger.warn(`[submission] Token error — expired=${isExpired} — ${err.message}`)
    jobs.delete(jobId)
    releaseDatasetLock()

    if (isExpired) {
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
    jobs.delete(jobId)
    releaseDatasetLock()
    return res.status(401).json({
      error: 'Could not obtain a valid token. Please reload the page.',
      code:  'SESSION_EXPIRED',
    })
  }

  // ── 3. mark the job running and respond immediately ──────────────────────────
  jobs.set(jobId, { status: 'running', startedAt: submissionStart })
  res.status(202).json({ jobId })

  // ── 4. run Python script in the background — nobody is waiting on `res`
  // anymore past this point; all outcomes update the job store instead ────────
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

  const cleanupTempFile = async () => {
    try { await unlink(jsonFilePath) } catch { /* best-effort, fine if already gone */ }
  }

  py.on('error', async (spawnError) => {
    logger.error(`[submission] job ${jobId} spawn error: ${spawnError.message}`)
    const errorMessage = `Failed to start Python: ${spawnError.message}`
    jobs.set(jobId, { status: 'error', error: errorMessage })
    scheduleJobCleanup(jobId)
    releaseDatasetLock()
    await cleanupTempFile()
    await sendFailureNotification({ datasetTitle, datasetVersionId, userEmail, errorMessage, stderr })
  })

  py.on('close', async (code) => {
    const elapsed = ((Date.now() - submissionStart) / 1000).toFixed(1)
    await cleanupTempFile()
    releaseDatasetLock()

    // ── parse stdout ──────────────────────────────────────────────────────────
    let parsed = null
    try {
      parsed = JSON.parse(stdout.trim())
    } catch {
      const errMsg = 'Python script produced invalid output.'
      logger.error(`[submission] job ${jobId} FAILED (${elapsed}s) — ${errMsg} stdout: "${stdout.slice(0, 200)}"`)
      jobs.set(jobId, { status: 'error', error: errMsg, detail: stdout.slice(0, 500) })
      scheduleJobCleanup(jobId)
      await sendFailureNotification({ datasetTitle, datasetVersionId, userEmail, errorMessage: errMsg, stderr })
      return
    }

    // ── explicit Python-level error ───────────────────────────────────────────
    if (parsed.error) {
      logger.error(`[submission] job ${jobId} FAILED (${elapsed}s) — Python error: ${parsed.error}`)
      jobs.set(jobId, { status: 'error', error: parsed.error, detail: parsed.detail || '' })
      scheduleJobCleanup(jobId)
      await sendFailureNotification({ datasetTitle, datasetVersionId, userEmail, errorMessage: parsed.error, stderr })
      return
    }

    // ── non-zero exit ─────────────────────────────────────────────────────────
    if (code !== 0) {
      const errMsg = `Python script exited with code ${code}.`
      logger.error(`[submission] job ${jobId} FAILED (${elapsed}s) — ${errMsg}`)
      jobs.set(jobId, { status: 'error', error: errMsg })
      scheduleJobCleanup(jobId)
      await sendFailureNotification({ datasetTitle, datasetVersionId, userEmail, errorMessage: errMsg, stderr })
      return
    }

    // ── success ───────────────────────────────────────────────────────────────
    logger.info(`[submission] job ${jobId} SUCCESS (${elapsed}s) — dataset: "${datasetTitle}" | dsv: ${datasetVersionId}`)
    jobs.set(jobId, { status: 'success', result: parsed })
    scheduleJobCleanup(jobId)
  })
}

async function getJobStatus(req, res) {
  const { jobId } = req.params
  const job = jobs.get(jobId)

  if (!job) {
    return res.status(404).json({
      error: 'Unknown or expired job. If a submission was in progress during a deployment, please try again.',
    })
  }

  if (job.status === 'pending' || job.status === 'running') {
    return res.status(200).json({ status: 'running' })
  }
  if (job.status === 'success') {
    return res.status(200).json({ status: 'success', result: job.result })
  }
  // status === 'error'
  return res.status(200).json({ status: 'error', error: job.error, detail: job.detail || '' })
}

export default router
