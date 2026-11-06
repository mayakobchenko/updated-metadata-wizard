// A curation ticket can cover several datasets, each with its own Data Sharing Collab (d-<uuid>) and a
// "Dataset Working Title". findDatasetCandidates() lists them in the order of the thread, once per ID:
// the entries found by the best matching rule (same rules as the dataset version ID of the ticket):
//   1. "Data sharing collab" followed by a d-<uuid>   2. any ".../Collabs/d-<uuid>" link   3. any d-<uuid>
const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
const TIERS = [
  new RegExp(`data\\s*sharing\\s*collab[\\s\\S]{0,300}?d-(${UUID})`, 'gi'),
  new RegExp(`Collabs/d-(${UUID})`, 'gi'),
  new RegExp(`d-(${UUID})`, 'gi'),
]

export function findDatasetCandidates(articles) {
  const candidates = []
  for (const re of TIERS) {
    for (const art of articles) {
      const body = art.body || ''
      for (const m of body.matchAll(re)) {
        const id = m[1].toLowerCase()
        if (candidates.some(c => c.id === id)) continue
        const after = body.slice(m.index + m[0].length, m.index + m[0].length + 400)
        const stop = after.search(/data\s*sharing\s*collab|d-[0-9a-f]{8}-/i)
        const t = (stop >= 0 ? after.slice(0, stop) : after).match(/dataset\s*working\s*title\s*:\s*([^\r\n<]+)/i)
        candidates.push({ id, title: t ? t[1].trim() : '' })
      }
    }
    if (candidates.length) break
  }
  return candidates
}
