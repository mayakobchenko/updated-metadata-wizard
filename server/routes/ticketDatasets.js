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
        // The title follows the Collab link. In an HTML article the link appears twice (href and text), so only a
        // DIFFERENT d-<uuid>, or the next "Data sharing collab" label, ends the part where the title is looked for.
        const after = body.slice(m.index + m[0].length, m.index + m[0].length + 600)
        const other = [...after.matchAll(/d-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi)].find(x => x[1].toLowerCase() !== id)
        const label = after.search(/data\s*sharing\s*collab/i)
        const stops = [other ? other.index : -1, label].filter(x => x >= 0)
        const part = stops.length ? after.slice(0, Math.min(...stops)) : after
        const t = part.match(/dataset\s*working\s*title\s*(?:<[^>]*>\s*)*:\s*(?:<[^>]*>\s*)*([^\r\n<]+)/i)
        const title = t ? t[1].replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim() : ''
        candidates.push({ id, title })
      }
    }
    if (candidates.length) break
  }
  return candidates
}
