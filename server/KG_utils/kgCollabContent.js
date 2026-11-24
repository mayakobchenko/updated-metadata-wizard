// Reads what the Knowledge Graph holds for one dataset version (the dataset version, its parent Dataset and the instances
// in its collab space "collab-d-<id>") with the logged-in person's own token, and turns it into wizard form data.
import { buildFormFromKg, uuidOf, V, T } from './kgContentToForm.js'

const KG = process.env.KG_CORE_API || 'https://core.kg.ebrains.eu/v3/instances'

export class KgReadError extends Error {
  constructor(message, status = 502, code = 'KG_ERROR') { super(message); this.status = status; this.code = code }
}

async function kgGet(token, url, tries = 3) {
  let last = null
  for (let i = 1; i <= tries; i++) {
    try {
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}`, accept: 'application/json' }, signal: AbortSignal.timeout(30000) })
      if (r.status < 500) return r
      last = `HTTP ${r.status}`
    } catch (e) { last = e.message }
    if (i < tries) await new Promise(res => setTimeout(res, 1000 * i))
  }
  throw new KgReadError(`The Knowledge Graph could not be reached (${last}).`, 502, 'KG_UNREACHABLE')
}

async function getInstance(token, id) {
  const r = await kgGet(token, `${KG}/${id}?stage=IN_PROGRESS`)
  if (r.status === 404) return null
  if (r.status === 401) throw new KgReadError('Your EBRAINS login has ended. Please log in again.', 401, 'SESSION_EXPIRED')
  if (r.status === 403) throw new KgReadError(`Your account is not allowed to read ${id} in the Knowledge Graph.`, 403, 'NO_READ_ACCESS')
  if (!r.ok) throw new KgReadError(`The Knowledge Graph answered ${r.status} for ${id}.`)
  return (await r.json()).data || null
}

async function listSpace(token, space, type) {
  const out = []
  for (let from = 0; ; from += 100) {
    const r = await kgGet(token, `${KG}?stage=IN_PROGRESS&space=${encodeURIComponent(space)}&type=${encodeURIComponent(T + type)}&size=100&from=${from}`)
    if (r.status === 401) throw new KgReadError('Your EBRAINS login has ended. Please log in again.', 401, 'SESSION_EXPIRED')
    if (r.status === 403) throw new KgReadError(`Your account is not allowed to read the collab space ${space}.`, 403, 'NO_READ_ACCESS')
    if (!r.ok) throw new KgReadError(`The Knowledge Graph answered ${r.status} when listing ${type} in ${space}.`)
    const page = (await r.json()).data || []
    out.push(...page)
    if (page.length < 100) return out
  }
}

// reads the instances with this many requests at the same time
async function getMany(token, ids, byId, limit = 8) {
  const todo = [...new Set(ids)].filter(id => id && !(id in byId))
  let next = 0
  const worker = async () => {
    while (next < todo.length) {
      const id = todo[next++]
      try { byId[id] = await getInstance(token, id) || null } catch (e) { if (e.code === 'SESSION_EXPIRED') throw e; byId[id] = null }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, todo.length) }, worker))
}

const refs = (inst, name) => (Array.isArray(inst?.[V + name]) ? inst[V + name] : inst?.[V + name] ? [inst[V + name]] : []).map(uuidOf).filter(Boolean)

export async function fetchCollabContent(token, dsvId) {
  const id = String(dsvId).toLowerCase()
  const dsv = await getInstance(token, id)
  if (!dsv) throw new KgReadError(`The dataset version ${id} was not found in the Knowledge Graph.`, 404, 'NOT_FOUND')

  // the parent Dataset (it points to the dataset version with hasVersion)
  let dataset = null
  try {
    const r = await kgGet(token, `${KG}/${id}/neighbors?stage=IN_PROGRESS`)
    if (r.ok) {
      const inbound = (await r.json()).data?.inbound || []
      const found = inbound.find(x => (x.types || []).includes(T + 'Dataset'))
      if (found) dataset = await getInstance(token, found.id)
    }
  } catch (e) { if (e.code === 'SESSION_EXPIRED') throw e }

  const space = `collab-d-${id}`
  const byId = {}
  const listed = {}
  // the specimen of the collab space, and all their states, in a few list requests (not one request per state)
  const TYPES = ['Subject', 'SubjectGroup', 'TissueSample', 'TissueSampleCollection',
    'SubjectState', 'SubjectGroupState', 'TissueSampleState', 'TissueSampleCollectionState']
  for (const type of TYPES) {
    listed[type] = await listSpace(token, space, type)
    if (type.endsWith('State')) for (const st of listed[type]) { const u = uuidOf(st['@id']); if (u) byId[u] = st }
  }
  const subjects = listed.Subject

  // everything else the form needs to name: persons, organisations, DOIs, strains, diseases
  const copyright = [].concat(dsv[V + 'copyright'] || [])[0]
  const personIds = [...refs(dataset, 'author'), ...refs(dataset, 'custodian'),
    ...[].concat(dsv[V + 'otherContribution'] || []).flatMap(c => refs(c, 'contributor')),
    ...(copyright ? refs(copyright, 'holder') : [])]
  const specimen = [...subjects, ...listed.TissueSample, ...listed.TissueSampleCollection]
  await getMany(token, [...personIds, ...refs(dsv, 'relatedPublication'), ...specimen.flatMap(x => refs(x, 'species')),
    // states that are not in the listing (a state that lives in another space is still read)
    ...specimen.flatMap(x => refs(x, 'studiedState')), ...listed.SubjectGroup.flatMap(x => refs(x, 'studiedState'))], byId)
  await getMany(token, [
    ...personIds.flatMap(p => refs(byId[p], 'digitalIdentifier')),
    ...Object.values(byId).filter(x => x && !(x['@type'] || []).some(t => /Person|ORCID|DOI|Organization/.test(t))).flatMap(x => refs(x, 'pathology')),
    ...specimen.flatMap(x => refs(x, 'species')).flatMap(sp => refs(byId[sp], 'species')),
  ], byId)

  return buildFormFromKg({ dsvId: id, dsv, dataset, byId, subjects, groups: listed.SubjectGroup, samples: listed.TissueSample, collections: listed.TissueSampleCollection })
}
