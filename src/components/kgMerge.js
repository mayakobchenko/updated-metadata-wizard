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
  'subjectMetadata.subjectGroups': (e) => lc(e?.name),
  'subjectMetadata.tissueSamples': (e) => lc(e?.sampleID),
  'subjectMetadata.tissueCollections': (e) => lc(e?.collectionID),
}
// entries that are in both: the form's entry stays, but the members that only the Knowledge Graph has are added
const MATCHED = {
  'subjectMetadata.subjectGroups': { list: 'subjects', key: (e) => lc(e?.subjectID), counts: 'subjects' },
  'subjectMetadata.tissueCollections': { list: 'samples', key: (e) => lc(e?.sampleID), counts: 'other' },
}
const NEVER_CHANGE = new Set(['datasetVersionId'])

export function mergeKgIntoForm(base, kg, { prefer = 'base' } = {}) {
  const added = { fields: 0, authors: 0, subjects: 0, contributors: 0, other: 0 }
  const count = (path, n) => {
    if (path === 'contribution.authors') added.authors += n
    else if (path === 'subjectMetadata.subjects' || path === 'subjectMetadata.subjectGroups' || path === 'subjectMetadata.tissueSamples' || path === 'subjectMetadata.tissueCollections') added.subjects += n
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
      const hook = MATCHED[path]
      const kgBy = new Map(k.map(x => [keyOf ? keyOf(x) : '', x]))
      if (prefer === 'kg' && keyOf) {
        // the Knowledge Graph's entry replaces the form's entry for the same person / subject / ...
        return [...b.map(x => kgBy.get(keyOf(x)) || x), ...extra]
      }
      if (hook) {
        return [...b.map(x => {
          const other = kgBy.get(keyOf(x))
          if (!other) return x
          const have = new Set((x[hook.list] || []).map(hook.key))
          const more = (other[hook.list] || []).filter(m => { const id = hook.key(m); return id && !have.has(id) })
          if (!more.length) return x
          if (hook.counts === 'subjects') added.subjects += more.length; else added.other += more.length
          return { ...x, [hook.list]: [...(x[hook.list] || []), ...more] }
        }), ...extra]
      }
      return [...b, ...extra]
    }
    if (prefer === 'kg') { if (b !== k) added.fields += 1; return k }
    return b            // the form has a value: it stays
  }
  const data = walk(base || {}, kg || {}, '')
  if (data.subjectMetadata) data.subjectMetadata = relinkSamples(data.subjectMetadata, kg?.subjectMetadata)
  const total = added.fields + added.authors + added.subjects + added.contributors + added.other
  return { data, added, changed: total > 0 }
}

// A tissue sample or collection that comes from the Knowledge Graph points to the subject (and time point) by the ids of
// the Knowledge Graph's copy of the form. When the form already has that subject under another id (a draft), the link is
// moved to the form's subject, matched by subject ID and by the position of the time point.
function relinkSamples(sm, kgSm) {
  if (!kgSm) return sm
  const lcid = (x) => lc(x?.subjectID)
  const all = (m) => [...(m?.subjects || []), ...(m?.subjectGroups || []).flatMap(g => g.subjects || [])]
  const mine = new Map(all(sm).map(x => [lcid(x), x]))
  const validIds = new Set(all(sm).map(x => x.id))
  const idMap = new Map()      // KG form's subject id -> { subject, states: Map(kg state id -> state id here) }
  for (const k of all(kgSm)) {
    const m = mine.get(lcid(k))
    if (!m) continue
    const states = new Map((k.states || []).map((st, i) => [st.id, (m.states || [])[i]?.id ?? (m.states || [])[0]?.id ?? null]))
    idMap.set(k.id, { subject: m, states })
  }
  const fix = (e) => {
    if (!e.linkedSubjectId || validIds.has(e.linkedSubjectId)) return e
    const t = idMap.get(e.linkedSubjectId)
    if (!t) return e
    return { ...e, linkedSubjectId: t.subject.id, linkedSubjectStateId: t.states.get(e.linkedSubjectStateId) ?? null }
  }
  const out = { ...sm }
  if (sm.tissueSamples) out.tissueSamples = sm.tissueSamples.map(fix)
  if (sm.tissueCollections) out.tissueCollections = sm.tissueCollections.map(c => ({ ...fix(c), samples: (c.samples || []).map(fix) }))
  // the subject lists the flat samples taken from it
  if (out.tissueSamples) {
    const link = (subj) => {
      const ids = out.tissueSamples.filter(t => t.linkedSubjectId === subj.id).map(t => t.id)
      const missing = ids.filter(id => !(subj.linkedSampleIds || []).includes(id))
      return missing.length ? { ...subj, linkedSampleIds: [...(subj.linkedSampleIds || []), ...missing] } : subj
    }
    if (out.subjects) out.subjects = out.subjects.map(link)
    if (out.subjectGroups) out.subjectGroups = out.subjectGroups.map(g => ({ ...g, subjects: (g.subjects || []).map(link) }))
  }
  return out
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
