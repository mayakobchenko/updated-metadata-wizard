// The wizard link can carry a ticket number, a dataset version ID, or both:
//   ?TicketNumber=123456
//   ?DatasetVersionUUID=3e860b3e-967c-425d-aa68-120451c5fe4b
//   ?TicketNumber=123456&DatasetVersionUUID=3e860b3e-967c-425d-aa68-120451c5fe4b
// Names are accepted in any letter case; "datasetVersionId" is accepted too.
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TICKET_KEYS = ['ticketnumber']
const DSV_KEYS = ['datasetversionuuid', 'datasetversionid']

export function readWizardParams(search) {
  const params = new URLSearchParams(search || '')
  let ticket = ''
  let datasetVersionId = ''
  for (const [k, v] of params) {
    const key = k.toLowerCase()
    const value = String(v || '').trim()
    if (!ticket && TICKET_KEYS.includes(key) && /^[A-Za-z0-9_-]{1,32}$/.test(value)) ticket = value
    if (!datasetVersionId && DSV_KEYS.includes(key) && UUID.test(value)) datasetVersionId = value.toLowerCase()
  }
  // Links that were typed or pasted wrongly still work: "?TicketNumber=123?DatasetVersionUUID=…" (a second "?" instead of
  // "&") and "?TicketNumber=123DatasetVersionUUID=…" (the "&" is missing).
  if (!ticket || !datasetVersionId) {
    let raw = String(search || '')
    try { raw = decodeURIComponent(raw) } catch { /* keep as it is */ }
    if (!ticket) {
      const m = raw.match(/ticketnumber=([A-Za-z0-9_-]{1,32}?)(?=$|[&?#=]|datasetversion)/i)
      if (m) ticket = m[1]
    }
    if (!datasetVersionId) {
      const m = raw.match(/datasetversion(?:uuid|id)=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)
      if (m) datasetVersionId = m[1].toLowerCase()
    }
  }
  // a ticket number is a short word of letters, digits, - and _ (normally digits only); anything else is kept out of the address
  return { ticket, datasetVersionId }
}

// "?TicketNumber=…&DatasetVersionUUID=…" with only what is known ('' when nothing is)
export function buildWizardSearch({ ticket, datasetVersionId } = {}) {
  const p = new URLSearchParams()
  if (ticket) p.set('TicketNumber', ticket)
  if (datasetVersionId && UUID.test(datasetVersionId)) p.set('DatasetVersionUUID', datasetVersionId.toLowerCase())
  const s = p.toString()
  return s ? `?${s}` : ''
}

// Put the ticket number and the dataset version back into the address bar (after the login redirect, which comes back
// without them, and after any other step that rewrote the address). Everything else in the query is dropped: the
// login answer (code, state, iss, session_state) is no longer needed once the login is done.
export function restoreWizardUrl(ids) {
  try {
    const search = buildWizardSearch(ids)
    const next = window.location.pathname + search + window.location.hash
    if (next !== window.location.pathname + window.location.search + window.location.hash) {
      window.history.replaceState({}, document.title, next)
    }
  } catch { /* the address bar is a convenience only */ }
}

// Called once when the page opens: a link that was written wrongly (see above) gets its proper form in the address bar,
// before anything uses it (the login takes the address as it is). The login answer itself (code=…) is left alone.
export function normalizeWizardUrl() {
  try {
    const q = new URLSearchParams(window.location.search)
    if (q.has('code') || q.has('error') || q.has('state')) return
    const ids = readWizardParams(window.location.search)
    if (!ids.ticket && !ids.datasetVersionId) return
    restoreWizardUrl(ids)
  } catch { /* the address bar is a convenience only */ }
}
