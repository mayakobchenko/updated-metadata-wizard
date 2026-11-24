// Adds what the Knowledge Graph holds for a dataset version (see server/KG_utils/kgContentToForm.js) to the data of the
// form WITHOUT taking anything away from it:
//   - a field that the form already has stays as it is (the draft / the person's entries win), an empty one is filled;
//   - lists of plain values (techniques, data types, ...) get the missing values added;
//   - lists of people, subjects, channels and publications get the entries added that are not in the form yet
//     (matched by ORCID or name, subject ID, channel text, DOI).
// With { prefer: 'kg' } the Knowledge Graph wins where it has a value (used when the person chooses "Knowledge Graph only").

const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype
export const isEmpty = (v) => v == null || v === '' || v === false || (Array.isArray(v) && v.length === 0) || (isPlain(v) && Object.keys(v).length === 0)
const lc = (s) => String(s ?? '').trim().toLowerCase()
const orcid = (s) => lc(s).replace(/^https?:\/\/orcid\.org\//, '')
const doi = (s) => lc(s).replace(/^https?:\/\/(dx\.)?doi\.org\//, '').replace(/^doi:/, '')
const person = (p) => orcid(p?.orcid) || lc(`${p?.firstName || ''} ${p?.lastName || p?.familyName || ''}`)

// path -> how to recognise "the same entry"
const KEYED = {
  'contribution.authors': person,
  'contribution.contributor.othercontr': person,
  'dataset2.supportChannels': (e) => lc(e?.newChannel),
  'dataset2.relatedPublications': (e) => doi(e?.newPublication),
  'subjectMetadata.subjects': (e) => lc(e?.subjectID),
}
const NEVER_CHANGE = new Set(['datasetVersionId'])

export function mergeKgIntoForm(base, kg, { prefer = 'base' } = {}) {
  const added = { fields: 0, authors: 0, subjects: 0, contributors: 0, other: 0 }
  const count = (path, n) => {
    if (path === 'contribution.authors') added.authors += n
    else if (path === 'subjectMetadata.subjects') added.subjects += n
    else if (path === 'contribution.contributor.othercontr') added.contributors += n
    else added.other += n
  }
  const walk = (b, k, path) => {
    if (isEmpty(k)) return b
    if (isEmpty(b)) {
      if (isPlain(k)) {      // nothing there yet: take it, but count what comes in
        const out = {}
        for (const key of Object.keys(k)) { if (NEVER_CHANGE.has(key) && !path) continue; out[key] = walk(undefined, k[key], path ? `${path}.${key}` : key) }
        return out
      }
      if (Array.isArray(k)) count(path, k.length); else added.fields += 1
      return k
    }
    if (isPlain(b) && isPlain(k)) {
      const out = { ...b }
      for (const key of Object.keys(k)) {
        if (NEVER_CHANGE.has(key) && !path) continue
        out[key] = walk(b[key], k[key], path ? `${path}.${key}` : key)
      }
      return out
    }
    if (Array.isArray(b) && Array.isArray(k)) {
      const keyOf = KEYED[path]
      const seen = new Set(b.map(x => (keyOf ? keyOf(x) : JSON.stringify(x))))
      const extra = k.filter(x => { const id = keyOf ? keyOf(x) : JSON.stringify(x); if (!id || seen.has(id)) return false; seen.add(id); return true })
      if (extra.length) count(path, extra.length)
      if (prefer === 'kg' && keyOf) {
        // the Knowledge Graph's entry replaces the form's entry for the same person / subject / ...
        const kgBy = new Map(k.map(x => [keyOf(x), x]))
        return [...b.map(x => kgBy.get(keyOf(x)) || x), ...extra]
      }
      return [...b, ...extra]
    }
    if (prefer === 'kg') { if (b !== k) added.fields += 1; return k }
    return b            // the form has a value: it stays
  }
  const data = walk(base || {}, kg || {}, '')
  const total = added.fields + added.authors + added.subjects + added.contributors + added.other
  return { data, added, changed: total > 0 }
}

// one line for the person: what was added
export function describeAdded(added) {
  const parts = []
  if (added.subjects) parts.push(`${added.subjects} subject${added.subjects === 1 ? '' : 's'}`)
  if (added.authors) parts.push(`${added.authors} author${added.authors === 1 ? '' : 's'}`)
  if (added.contributors) parts.push(`${added.contributors} other contributor${added.contributors === 1 ? '' : 's'}`)
  if (added.fields) parts.push(`${added.fields} empty field${added.fields === 1 ? '' : 's'} filled`)
  if (added.other) parts.push(`${added.other} more list entr${added.other === 1 ? 'y' : 'ies'}`)
  return parts.join(', ')
}
