// Zammad helpers used when a KG upload cannot start or fails.
//   - (JSON attachment support in addTicketNote is kept but currently unused)
//   - addTicketNote():           internal note without attachment
//   - emailSupport():            an e-mail sent through Zammad (article type "email")
//                                on a support ticket, so no SMTP password is needed
// Nothing here ever throws: notification problems must not break the upload flow.
import dotenv from 'dotenv'
import logger from '../logger.js'

dotenv.config()

const ZAMMAD_BASE = 'https://support.humanbrainproject.eu'
const SUPPORT_EMAIL = process.env.ZAMMAD_SUPPORT_EMAIL || 'maya.kobchenko@medisin.uio.no'
// ticket that carries the notification e-mails (default: the test_mayas_app ticket)
const SUPPORT_TICKET_ID = parseInt(process.env.ZAMMAD_SUPPORT_TICKET_ID || '24211', 10)

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const b64 = (text) => Buffer.from(String(text), 'utf-8').toString('base64')

async function postArticle(article) {
  const token = process.env.MAYA_ZAMMAD_TOKEN
  if (!token) throw new Error('MAYA_ZAMMAD_TOKEN is not set')
  const response = await fetch(`${ZAMMAD_BASE}/api/v1/ticket_articles`, {
    method: 'POST',
    body: JSON.stringify(article),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`Zammad HTTP ${response.status}: ${JSON.stringify(data).slice(0, 300)}`)
  return data
}

// Internal note (agents only, no e-mail) with an optional JSON attachment.
export async function addTicketNote(ticketId, { subject, body, jsonData, datasetTitle }) {
  const id = parseInt(ticketId, 10)
  if (!id) return null
  try {
    const article = {
      ticket_id: id,
      subject,
      body,
      content_type: 'text/plain',
      type: 'note',
      internal: true,
      sender: 'Agent',
      time_unit: '0',
    }
    if (jsonData) {
      const name = String(datasetTitle || 'dataset').replace(/[^a-z0-9_-]/gi, '_')
      article.attachments = [{
        filename: `metadata_${name}_${Date.now()}.json`,
        data: b64(JSON.stringify(jsonData, null, 2)),
        'mime-type': 'application/json',
      }]
    }
    const data = await postArticle(article)
    logger.info(`Zammad note added to ticket ${id}, article id: ${data.id}`)
    return data.id
  } catch (err) {
    logger.error(`Could not add note to Zammad ticket ${id}: ${err.message}`)
    return null
  }
}

// Same wording for both outputs, so the ticket note and the e-mail agree.
function failureText({ reason, datasetTitle, datasetVersionId, userEmail, ticketNumber }) {
  return [
    'The upload of this submission to the EBRAINS Knowledge Graph did NOT run / FAILED.',
    '',
    `Reason:             ${reason}`,
    `Dataset title:      ${datasetTitle || '(not set)'}`,
    `Dataset version ID: ${datasetVersionId || '(missing)'}`,
    `Ticket number:      ${ticketNumber || '(unknown)'}`,
    `User email:         ${userEmail || '(not set)'}`,
    `Time (UTC):         ${new Date().toISOString()}`,
  ].join('\n')
}

// E-mail through Zammad to the curators (needs MAYA_ZAMMAD_TOKEN, no SMTP).
export async function emailSupport(info, { stderr = '', detail = '' } = {}) {
  try {
    const rows = failureText(info).split('\n').filter(Boolean).map(l => `<div>${esc(l)}</div>`).join('')
    const html = `<p><b>[Metadata Wizard] Upload FAILED</b></p>${rows}` +
      (detail ? `<p><b>Detail:</b><br><pre>${esc(String(detail).slice(0, 2000))}</pre></p>` : '')
    const article = {
      ticket_id: SUPPORT_TICKET_ID,
      subject: `[Metadata Wizard] Upload FAILED — ${info.datasetTitle || info.ticketNumber || 'unknown dataset'}`.slice(0, 150),
      body: html,
      content_type: 'text/html',
      type: 'email',
      internal: 'false',
      sender: 'Agent',
      time_unit: '0',
      to: SUPPORT_EMAIL,
      origin_by_id: process.env.ZAMMAD_ORIGIN_BY_ID || '1292', // makes the mail appear to come from support
    }
    if (stderr) {
      article.attachments = [{ filename: 'python_stderr.log', data: b64(String(stderr).slice(-20000)), 'mime-type': 'text/plain' }]
    }
    const data = await postArticle(article)
    logger.info(`Failure e-mail sent via Zammad to ${SUPPORT_EMAIL}, message id: ${data.message_id}`)
    return true
  } catch (err) {
    logger.error(`Could not send failure e-mail via Zammad: ${err.message}`)
    return false
  }
}
