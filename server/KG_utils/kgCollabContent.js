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
  const subjects = await listSpace(token, space, 'Subject')
  const ignored = {}
  for (const [label, type] of [['subject groups', 'SubjectGroup'], ['tissue samples', 'TissueSample'], ['tissue sample collections', 'TissueSampleCollection']]) {
    try { ignored[label] = (await listSpace(token, space, type)).length } catch (e) { if (e.code === 'SESSION_EXPIRED') throw e }
  }

  // everything the form needs to name: persons, organisations, DOIs, states, strains, diseases
  const byId = {}
  const copyright = [].concat(dsv[V + 'copyright'] || [])[0]
  const personIds = [...refs(dataset, 'author'), ...refs(dataset, 'custodian'),
    ...[].concat(dsv[V + 'otherContribution'] || []).flatMap(c => refs(c, 'contributor')),
    ...(copyright ? refs(copyright, 'holder') : [])]
  await getMany(token, [...personIds, ...refs(dsv, 'relatedPublication'), ...subjects.flatMap(s => [...refs(s, 'studiedState'), ...refs(s, 'species')])], byId)
  await getMany(token, [
    ...personIds.flatMap(p => refs(byId[p], 'digitalIdentifier')),
    ...subjects.flatMap(s => refs(s, 'studiedState')).flatMap(st => refs(byId[st], 'pathology')),
    ...subjects.flatMap(s => refs(s, 'species')).flatMap(sp => refs(byId[sp], 'species')),
  ], byId)

  return buildFormFromKg({ dsvId: id, dsv, dataset, byId, subjects, ignored })
}
