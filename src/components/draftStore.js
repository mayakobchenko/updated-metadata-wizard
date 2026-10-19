// Saves the Data Descriptor answers in THIS browser (localStorage) so a half-filled descriptor
// survives closing the tab. Keyed by dataset; text fields only (no figures, no AI key).
const PREFIX = 'mw_dd_draft:'
const FIELDS = ['whatAreTheData', 'scientificContext', 'motivation', 'hypothesis', 'summary', 'methods', 'software',
  'dataDescription', 'dataRecordsTree', 'results', 'dataRepository', 'usageNotes', 'limitations', 'funding',
  'authorContributions', 'references', 'aiDomain']

export function saveDraft(id, dd, formats) {
  if (!id) return
  try {
    const out = { savedAt: Date.now(), values: {}, formats: Array.isArray(formats) ? formats : [] }
    FIELDS.forEach(f => { if (typeof dd?.[f] === 'string' && dd[f].trim()) out.values[f] = dd[f] })
    if (!Object.keys(out.values).length && !out.formats.length) { localStorage.removeItem(PREFIX + id); return }
    localStorage.setItem(PREFIX + id, JSON.stringify(out))
  } catch { /* storage unavailable or full */ }
}
export function loadDraft(id) {
  if (!id) return null
  try { return JSON.parse(localStorage.getItem(PREFIX + id)) } catch { return null }
}
export function clearDraft(id) { try { localStorage.removeItem(PREFIX + id) } catch { /* ignore */ } }
