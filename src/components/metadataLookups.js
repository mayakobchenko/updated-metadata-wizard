// ── metadataLookups.js ────────────────────────────────────────────────────────
// Shared lookup builder used by PDF, DOCX, and TXT generators.

async function fetchJson(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

export async function buildLookups() {
  const [
    licensesRes, dataTypesRes, techniquesRes, studyTargetsRes,
    approachesRes, prepTypesRes, contribTypesRes, contributorsRes, fundingRes,
  ] = await Promise.all([
    fetchJson('/api/kginfo/license'),
    fetchJson('/api/kginfo/datatypes'),
    fetchJson('/api/kginfo/techniques'),
    fetchJson('/api/kginfo/studytargets'),
    fetchJson('/api/kginfo/experimentalapproaches'),
    fetchJson('/api/kginfo/preparationtypes'),
    fetchJson('/api/kginfo/typecontribution'),
    fetchJson('/api/kginfo/contributorsfile'),
    fetchJson('/api/kginfo/funding'),
  ])

  const toMap = (arr, idKey = 'identifier', nameKey = 'name') => {
    const m = new Map()
    if (Array.isArray(arr)) arr.forEach(i => { if (i[idKey] && i[nameKey]) m.set(i[idKey], i[nameKey]) })
    return m
  }

  const licenseMap = new Map()
  const licenses = licensesRes?.licenses || licensesRes || []
  if (Array.isArray(licenses)) {
    licenses.forEach(l => { if (l.identifier) licenseMap.set(l.identifier, l.shortName || l.fullName || l.identifier) })
  }

  const techniqueMap   = new Map()
  const techniques     = techniquesRes?.techniques || techniquesRes || []
  if (Array.isArray(techniques)) techniques.forEach(t => { if (t.identifier) techniqueMap.set(t.identifier, t.name) })

  const studyTargetMap = new Map()
  const studyTargets   = studyTargetsRes?.studyTargets || studyTargetsRes || []
  if (Array.isArray(studyTargets)) studyTargets.forEach(t => { if (t.identifier) studyTargetMap.set(t.identifier, t.name) })

  const contributorMap = new Map()
  const contributors   = contributorsRes?.persons || contributorsRes || []
  if (Array.isArray(contributors)) {
    contributors.forEach(p => { if (p.uuid) contributorMap.set(p.uuid, `${p.givenName || ''} ${p.familyName || ''}`.trim()) })
  }

  const funderMap  = new Map()
  const fundingData = fundingRes?.funding || fundingRes || []
  if (Array.isArray(fundingData)) {
    fundingData.forEach(f => { if (f.id) funderMap.set(f.id, f.funderName || f.name || f.id) })
  }

  return {
    licenseMap,
    dataTypeMap:    toMap(dataTypesRes?.dataTypes     || [], 'identifier', 'name'),
    techniqueMap,
    studyTargetMap,
    approachMap:    toMap(approachesRes?.experimentalApproaches || approachesRes || [], 'identifier', 'name'),
    prepTypeMap:    toMap(prepTypesRes?.preparationTypes        || prepTypesRes  || [], 'identifier', 'name'),
    contribTypeMap: toMap(contribTypesRes?.contributionTypes    || contribTypesRes || [], 'identifier', 'name'),
    contributorMap,
    funderMap,
  }
}

export function resolve(idOrIds, map, fallback = '') {
  if (!idOrIds) return fallback
  if (Array.isArray(idOrIds)) {
    const names = idOrIds.map(id => map.get(id) || id).filter(Boolean)
    return names.length ? names.join(', ') : fallback
  }
  return map.get(idOrIds) || String(idOrIds) || fallback
}