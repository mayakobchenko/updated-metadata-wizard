// Renders a data descriptor (Markdown in the data descriptor skill's format) into the official EBRAINS Word
// template with the skill's own script (python-docx). The browser keeps a JavaScript generator as a
// fallback, so any failure here (script, python-docx missing, time-out) is reported and never blocks the user.
import express from 'express'
import { execFile } from 'child_process'
import { mkdtemp, writeFile, readFile, rm } from 'fs/promises'
import { existsSync } from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import logger from '../logger.js'
import { getUserAccessToken } from './userSessions.js'

const router = express.Router()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
// render.py runs the skill's fill_word_template.py unchanged, but writes the running header without quotation marks
const SCRIPT = path.join(__dirname, 'python_scripts', 'dd', 'render.py')
const TEMPLATE = path.join(__dirname, 'python_scripts', 'dd', 'word_template.docx')
const TIMEOUT_MS = 30000
const MAX_MD_CHARS = 400000
const MAX_IMAGES = 20
const MAX_IMAGE_BYTES = 4 * 1024 * 1024
const SAFE_IMAGE_NAME = /^[A-Za-z0-9_-]{1,40}\.(png|jpe?g)$/i

router.post('/render', async (req, res) => {
  // only logged-in users (same session cookie as the rest of the wizard)
  let token = null
  try { token = await getUserAccessToken(req) } catch { /* treated as not logged in */ }
  if (!token) return res.status(401).json({ error: 'Please log in again.', code: 'SESSION_EXPIRED' })

  const { markdown, images = [] } = req.body || {}
  if (typeof markdown !== 'string' || !markdown.trim() || markdown.length > MAX_MD_CHARS) {
    return res.status(400).json({ error: 'The Markdown text is missing or too long.' })
  }
  if (!Array.isArray(images) || images.length > MAX_IMAGES) {
    return res.status(400).json({ error: 'Too many images.' })
  }
  if (!existsSync(SCRIPT) || !existsSync(TEMPLATE)) {
    return res.status(501).json({ error: 'The Word renderer is not installed on this server.' })
  }

  let dir
  try {
    dir = await mkdtemp(path.join(os.tmpdir(), 'ddrender-'))
    const mdPath = path.join(dir, 'descriptor.md')
    const outPath = path.join(dir, 'descriptor.docx')
    await writeFile(mdPath, markdown, 'utf8')
    for (const img of images) {
      if (!img || !SAFE_IMAGE_NAME.test(img.name || '') || typeof img.base64 !== 'string') {
        return res.status(400).json({ error: 'Invalid image.' })
      }
      const buf = Buffer.from(img.base64, 'base64')
      if (!buf.length || buf.length > MAX_IMAGE_BYTES) return res.status(400).json({ error: 'An image is empty or too large.' })
      await writeFile(path.join(dir, img.name), buf)   // fixed, validated file names only
    }

    // fixed arguments, no shell
    const { code, stderr } = await new Promise((resolve) => {
      execFile('python3', [SCRIPT, mdPath, '-o', outPath, '--template', TEMPLATE],
        { timeout: TIMEOUT_MS, maxBuffer: 1024 * 1024, cwd: dir },
        (err, _stdout, errOut) => resolve({ code: err ? (err.code ?? 1) : 0, stderr: String(errOut || '') }))
    })

    if (!existsSync(outPath)) {
      logger.warn(`[ddRender] no output, exit ${code}: ${stderr.slice(0, 500)}`)
      return res.status(500).json({ error: 'The Word renderer failed.', detail: stderr.slice(0, 500) })
    }
    const docx = await readFile(outPath)
    // exit code 1 with a file means the script found problems in the content ("not ready"); report them
    const problems = code === 0 ? [] : stderr.split('\n').map(l => l.trim()).filter(l => l.startsWith('- ')).map(l => l.slice(2))
    logger.info(`[ddRender] rendered ${docx.length} bytes, ${problems.length} problem(s)`)
    return res.json({ ok: code === 0, problems, docxBase64: docx.toString('base64') })
  } catch (err) {
    logger.error(`[ddRender] ${err.message}`)
    return res.status(500).json({ error: 'The Word renderer failed.' })
  } finally {
    if (dir) rm(dir, { recursive: true, force: true }).catch(() => {})
  }
})

export default router
