import express        from 'express'
import dotenv         from 'dotenv'
import { spawn }      from 'child_process'
import path           from 'path'
import { fileURLToPath } from 'url'
import { writeFile }  from 'fs/promises'
import tokenFunctions from './tokenManager.js'
import logger         from '../logger.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)
const router     = express.Router()

router.get('/hello',      sayHello)
router.post('/runpython', runPythonScript)

async function sayHello(req, res) {
  res.json({ message: 'Hello from python uploading route' })
}

async function runPythonScript(req, res) {
  const jsonData     = req.body
  const jsonFilePath = path.join(__dirname, 'data.json')

  // ── 1. write form data to disk ──────────────────────────────────────────────
  try {
    await writeFile(jsonFilePath, JSON.stringify(jsonData, null, 2))
  } catch (writeError) {
    logger.error(`JSON file write error: ${writeError}`)
    return res.status(500).json({ error: 'Failed to write JSON file' })
  }

  // ── 2. get KG token ─────────────────────────────────────────────────────────
  let kg_token
  try {
    kg_token = await tokenFunctions.getWorkingToken()
  } catch (err) {
    logger.error(`Token error: ${err.message}`)
    return res.status(401).json({
      error: 'Your session has expired. Please reload the page and log in again.'
    })
  }

  if (!kg_token) {
    return res.status(401).json({
      error: 'Your session has expired. Please reload the page and log in again.'
    })
  }

  // ── 3. run Python script using spawn (not exec) ─────────────────────────────
  // spawn is safer than exec — no shell injection risk, handles large output better
  const scriptPath = path.join(__dirname, './python_scripts/python_upload_json.py')

  let stdout = ''
  let stderr = ''

  const py = spawn('python3', [scriptPath, kg_token, jsonFilePath])

  py.stdout.on('data', (chunk) => { stdout += chunk.toString() })

  py.stderr.on('data', (chunk) => {
    const text = chunk.toString()
    stderr += text
    // log stderr for debugging — never treat it as an error condition
    logger.info(`[python stderr] ${text.trim()}`)
  })

  py.on('error', (spawnError) => {
    logger.error(`Failed to spawn Python: ${spawnError.message}`)
    if (!res.headersSent) {
      res.status(500).json({ error: `Failed to start Python: ${spawnError.message}` })
    }
  })

  py.on('close', (code) => {
    logger.info(`Python exited with code ${code}`)

    // ── parse stdout as JSON ──────────────────────────────────────────────────
    // stderr is ONLY for debugging — success/failure is determined by:
    //   1. parsed.error field in stdout JSON
    //   2. non-zero exit code
    let parsed = null
    try {
      parsed = JSON.parse(stdout.trim())
    } catch (parseError) {
      logger.error(`Failed to parse Python stdout: "${stdout.slice(0, 200)}"`)
      if (!res.headersSent) {
        res.status(500).json({
          error:  'Python script produced invalid output.',
          detail: stdout.slice(0, 500)
        })
      }
      return
    }

    // ── explicit error in Python output ───────────────────────────────────────
    if (parsed.error) {
      logger.error(`Python script error: ${parsed.error}`)
      if (!res.headersSent) {
        res.status(500).json({
          error:  parsed.error,
          detail: parsed.detail || ''
        })
      }
      return
    }

    // ── non-zero exit with no JSON error ──────────────────────────────────────
    if (code !== 0) {
      logger.error(`Python exited ${code}`)
      if (!res.headersSent) {
        res.status(500).json({
          error: `Python script exited with code ${code}.`
        })
      }
      return
    }

    // ── success ───────────────────────────────────────────────────────────────
    if (!res.headersSent) {
      res.status(200).json(parsed)
    }
  })
}

export default router