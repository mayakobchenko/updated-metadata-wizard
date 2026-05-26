// ── metadataLookups.js ────────────────────────────────────────────────────────

const KG_PREFIX = 'https://kg.ebrains.eu/api/instances/'

function toUuid(id) {
  if (!id) return ''
  return String(id).split('/').pop()
}

async function fetchJson(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) {
      console.warn(`metadataLookups: ${url} returned ${res.status}`)
      return null
    }
    return res.json()
  } catch (err) {
    console.warn(`metadataLookups: failed to fetch ${url}:`, err.message)
    return null
  }
}

export async function buildLookups() {

  // ── fetch everything in parallel ──────────────────────────────────────────
  // Response key names are taken directly from infoKG.js and infoSubjects.js
  const [
    licensesRes,       // { license: [...] }            — getLicense
    dataTypesRes,      // { dataTypes: [...] }           — getSemanticDataTypes
    techniquesRes,     // { techniques: [...] }          — getTechniques
    studyTargetsRes,   // { studyTargets: [...] }        — getStudyTargets
    approachesRes,     // { expApproach: [...] }         — getExperimentalApproaches
    prepTypesRes,      // { prepType: [...] }            — getPreparationTypes
    contribTypesRes,   // { typecontribution: [...] }    — getTypeContribution
    personsRes,        // { person: [...] }              — getContributorsfile
    fundingRes,        // { funding: [...] }             — /funding route
    // subject controlled terms — keys from infoSubjects.js fetcher calls
    bioSexRes,         // { biosex: [...] }
    ageCatRes,         // { age_cat: [...] }
    handednessRes,     // { handedness: [...] }
    speciesRes,        // { species: [...] }
    strainRes,         // { strain: [...] }
    diseaseRes,        // { disease: [...] }
    diseaseModelRes,   // { diseaseModel: [...] }
    subjectAttrRes,    // { subjectAttribute: [...] }
    tissueAttrRes,     // { tissueSampleAttribute: [...] }
    tissueSampleTypeRes, // { tissueSampleType: [...] }
    lateralityRes,     // { laterality: [...] }
    organRes,          // { origin: [...] }  ← note: key is 'origin' not 'organ'
  ] = await Promise.all([
    fetchJson('/api/kginfo/license'),
    fetchJson('/api/kginfo/datatypes'),
    fetchJson('/api/kginfo/techniques'),
    fetchJson('/api/kginfo/studytargets'),
    fetchJson('/api/kginfo/experimentalapproaches'),
    fetchJson('/api/kginfo/preparationtypes'),
    fetchJson('/api/kginfo/typecontribution'),
    fetchJson('/api/kginfo/contributorsfile'),   // returns { person: [...] }
    fetchJson('/api/kginfo/funding'),
    fetchJson('/api/subjects/sex'),
    fetchJson('/api/subjects/agecategory'),
    fetchJson('/api/subjects/handedness'),
    fetchJson('/api/subjects/species'),
    fetchJson('/api/subjects/strain'),
    fetchJson('/api/subjects/disease'),
    fetchJson('/api/subjects/diseasemodel'),
    fetchJson('/api/subjects/subjectattribute'),
    fetchJson('/api/subjects/tissuesampleattribute'),
    fetchJson('/api/subjects/tissuesampletype'),
    fetchJson('/api/subjects/laterality'),
    fetchJson('/api/subjects/origin'),
  ])

  // ── map builder — keys both full URL and bare UUID ────────────────────────
  function makeMap(arr, idKey = 'identifier', nameKey = 'name') {
    const m = new Map()
    if (!Array.isArray(arr)) return m
    arr.forEach(item => {
      const id   = item[idKey]
      const name = item[nameKey]
      if (!id || !name) return
      m.set(id,         name)
      m.set(toUuid(id), name)
    })
    return m
  }

  // ── persons — from getContributorsfile: { person: [...] } ─────────────────
  // Each entry has: uuid (full KG URL like https://kg.../uuid), givenName, familyName
  const contributorMap = new Map()
  const persons = personsRes?.person || []
  if (Array.isArray(persons)) {
    persons.forEach(p => {
      // Person.json stores uuid as the full KG URL
      if (!p.uuid) return
      const name = `${p.givenName || ''} ${p.familyName || ''}`.trim()
      if (!name) return
      contributorMap.set(p.uuid,              name)   // full URL as stored
      contributorMap.set(toUuid(p.uuid),      name)   // bare UUID
      contributorMap.set(KG_PREFIX + toUuid(p.uuid), name)  // KG_PREFIX + bare UUID
    })
  }

  // ── licenses — from getLicense: { license: [...] } ───────────────────────
  // Each entry has: identifier (full URL), shortName, fullName
  const licenseMap = new Map()
  const licenses = licensesRes?.license || []
  if (Array.isArray(licenses)) {
    licenses.forEach(l => {
      if (!l.identifier) return
      const name = l.shortName || l.fullName || l.identifier
      licenseMap.set(l.identifier,         name)
      licenseMap.set(toUuid(l.identifier), name)
    })
  }

  // ── funders — from /funding: { funding: [...] } ───────────────────────────
  // Each enriched entry has: uuid, awardTitle, awardNumber, funder {@id}, funderName
  const funderMap  = new Map()
  // For the download we want to resolve funder @id → funderName
  // The funding array has funder: { '@id': fullUrl } and funderName string
  const fundingArr = fundingRes?.funding || []
  if (Array.isArray(fundingArr)) {
    fundingArr.forEach(f => {
      const funderId = f.funder?.['@id']
      const name     = f.funderName
      if (!funderId || !name || name === 'Unknown funder') return
      funderMap.set(funderId,         name)
      funderMap.set(toUuid(funderId), name)
    })
  }

  // ── data types — from getSemanticDataTypes: { dataTypes: [...] } ──────────
  // Each entry has: identifier, name
  const dataTypeMap = makeMap(dataTypesRes?.dataTypes || [], 'identifier', 'name')

  // ── techniques — from getTechniques: { techniques: [...] } ───────────────
  // Each entry has: identifier, name, type
  const techniqueMap = makeMap(techniquesRes?.techniques || [], 'identifier', 'name')

  // ── study targets — from getStudyTargets: { studyTargets: [...] } ─────────
  const studyTargetMap = makeMap(studyTargetsRes?.studyTargets || [], 'identifier', 'name')

  // ── experimental approaches — from getExperimentalApproaches: { expApproach: [...] } ──
  const approachMap = makeMap(approachesRes?.expApproach || [], 'identifier', 'name')

  // ── preparation types — from getPreparationTypes: { prepType: [...] } ────
  const prepTypeMap = makeMap(prepTypesRes?.prepType || [], 'identifier', 'name')

  // ── contribution types — from getTypeContribution: { typecontribution: [...] } ──
  const contribTypeMap = makeMap(contribTypesRes?.typecontribution || [], 'identifier', 'name')

  // ── subject controlled terms ──────────────────────────────────────────────
  // Keys match what Subjects.jsx fetches and the response shape from infoSubjects.js

  return {
    // dataset fields
    licenseMap,
    dataTypeMap,
    techniqueMap,
    studyTargetMap,
    approachMap,
    prepTypeMap,
    contribTypeMap,
    contributorMap,
    funderMap,
    // subject fields
    bioSexMap:       makeMap(bioSexRes?.biosex                || [], 'identifier', 'name'),
    ageCatMap:       makeMap(ageCatRes?.age_cat               || [], 'identifier', 'name'),
    handednessMap:   makeMap(handednessRes?.handedness         || [], 'identifier', 'name'),
    speciesMap:      makeMap(speciesRes?.species               || [], 'identifier', 'name'),
    strainMap:       makeMap(strainRes?.strain                 || [], 'identifier', 'name'),
    diseaseMap:      makeMap([
                       ...(diseaseRes?.disease       || []),
                       ...(diseaseModelRes?.diseaseModel || []),
                     ], 'identifier', 'name'),
    subjectAttrMap:  makeMap(subjectAttrRes?.subjectAttribute   || [], 'identifier', 'name'),
    tissueAttrMap:   makeMap(tissueAttrRes?.tissueSampleAttribute|| [], 'identifier', 'name'),
    tissueSampleTypeMap: makeMap(tissueSampleTypeRes?.tissueSampleType || [], 'identifier', 'name'),
    lateralityMap:   makeMap(lateralityRes?.laterality         || [], 'identifier', 'name'),
    organMap:        makeMap(organRes?.origin                  || [], 'identifier', 'name'),
  }
}

export function resolve(idOrIds, map, fallback = '') {
  if (!idOrIds) return fallback
  const ids   = Array.isArray(idOrIds) ? idOrIds : [idOrIds]
  const names = ids.map(id => {
    if (!id) return null
    return map.get(id) || map.get(toUuid(id)) || null
  }).filter(Boolean)
  return names.length ? names.join(', ') : fallback
}