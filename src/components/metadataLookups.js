// ── metadataLookups.js ────────────────────────────────────────────────────────

async function fetchJson(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

// normalise any KG URL or bare UUID to just the UUID for consistent map keys
function toUuid(id) {
  if (!id) return ''
  return String(id).split('/').pop()
}

export async function buildLookups() {
  const [
    licensesRes, dataTypesRes, techniquesRes, studyTargetsRes,
    approachesRes, prepTypesRes, contribTypesRes, contributorsRes, fundingRes,
    bioSexRes, ageCatRes, handednessRes, speciesRes, strainRes,
    diseaseRes, subjectAttrRes, tissueAttrRes, organRes,
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
    // controlled terms needed for subject details
    fetchJson('/api/subjects/biologicalsex'),
    fetchJson('/api/subjects/agecategory'),
    fetchJson('/api/subjects/handedness'),
    fetchJson('/api/subjects/species'),
    fetchJson('/api/subjects/strain'),
    fetchJson('/api/subjects/disease'),
    fetchJson('/api/subjects/subjectattribute'),
    fetchJson('/api/subjects/tissuesampleattribute'),
    fetchJson('/api/subjects/organ'),
  ])

  // build map keyed by BOTH full URL and bare UUID so either form resolves
  function makeMap(arr, idKey = 'identifier', nameKey = 'name') {
    const m = new Map()
    if (!Array.isArray(arr)) return m
    arr.forEach(item => {
      const id   = item[idKey]
      const name = item[nameKey]
      if (!id || !name) return
      m.set(id,          name)   // full URL key
      m.set(toUuid(id),  name)   // bare UUID key
    })
    return m
  }

  // contributors: keyed by uuid AND full URL
  const contributorMap = new Map()
  const contributors   = contributorsRes?.persons || contributorsRes || []
  if (Array.isArray(contributors)) {
    contributors.forEach(p => {
      if (!p.uuid) return
      const name = `${p.givenName || ''} ${p.familyName || ''}`.trim()
      contributorMap.set(p.uuid, name)
      contributorMap.set(KG_PREFIX + p.uuid, name)
    })
  }

  // licenses
  const licenseMap = new Map()
  const licenses   = licensesRes?.licenses || licensesRes || []
  if (Array.isArray(licenses)) {
    licenses.forEach(l => {
      if (!l.identifier) return
      const name = l.shortName || l.fullName || l.identifier
      licenseMap.set(l.identifier,         name)
      licenseMap.set(toUuid(l.identifier), name)
    })
  }

  // funders
  const funderMap  = new Map()
  const fundingArr = fundingRes?.funding || fundingRes || []
  if (Array.isArray(fundingArr)) {
    fundingArr.forEach(f => {
      if (!f.id) return
      const name = f.funderName || f.name || f.id
      funderMap.set(f.id,          name)
      funderMap.set(toUuid(f.id),  name)
    })
  }

  return {
    licenseMap,
    dataTypeMap:    makeMap(dataTypesRes?.dataTypes                     || [], 'identifier', 'name'),
    techniqueMap:   makeMap(techniquesRes?.techniques || techniquesRes  || [], 'identifier', 'name'),
    studyTargetMap: makeMap(studyTargetsRes?.studyTargets || studyTargetsRes || [], 'identifier', 'name'),
    approachMap:    makeMap(approachesRes?.experimentalApproaches || approachesRes || [], 'identifier', 'name'),
    prepTypeMap:    makeMap(prepTypesRes?.preparationTypes || prepTypesRes || [], 'identifier', 'name'),
    contribTypeMap: makeMap(contribTypesRes?.contributionTypes || contribTypesRes || [], 'identifier', 'name'),
    contributorMap,
    funderMap,
    // subject controlled terms
    bioSexMap:       makeMap(bioSexRes?.biologicalSex    || bioSexRes    || [], 'identifier', 'name'),
    ageCatMap:       makeMap(ageCatRes?.ageCategory      || ageCatRes    || [], 'identifier', 'name'),
    handednessMap:   makeMap(handednessRes?.handedness   || handednessRes|| [], 'identifier', 'name'),
    speciesMap:      makeMap(speciesRes?.species         || speciesRes   || [], 'identifier', 'name'),
    strainMap:       makeMap(strainRes?.strain           || strainRes    || [], 'identifier', 'name'),
    diseaseMap:      makeMap(diseaseRes?.disease         || diseaseRes   || [], 'identifier', 'name'),
    subjectAttrMap:  makeMap(subjectAttrRes?.subjectAttribute || subjectAttrRes || [], 'identifier', 'name'),
    tissueAttrMap:   makeMap(tissueAttrRes?.tissueSampleAttribute || tissueAttrRes || [], 'identifier', 'name'),
    organMap:        makeMap(organRes?.organ             || organRes     || [], 'identifier', 'name'),
  }
}

const KG_PREFIX = 'https://kg.ebrains.eu/api/instances/'

export function resolve(idOrIds, map, fallback = '') {
  if (!idOrIds) return fallback
  const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds]
  const names = ids.map(id => {
    if (!id) return null
    return map.get(id) || map.get(toUuid(id)) || null
  }).filter(Boolean)
  return names.length ? names.join(', ') : fallback
}
