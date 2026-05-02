import fetchControlledTerms from './fetchControlledTerms.js'
import { fetchCoreSchemaInstances } from './fetchCoreSchemaInstances.js'
import { fetchLicenses } from './fetchLicenses.js'
import fetchStudyTargets from './fetchStudyTargets.js'
import fetchTechniques from './fetchTechniques.js'
import fetchFunders from './fetchFunders.js'
import { getServiceToken } from './serviceTokenManager.js'

// ── RELEASED config — works with any token ────────────────────────────────────
const configReleased = [
  { openMindsType: "ORCID",        typeProperties: ["identifier"] },
  { openMindsType: "Person",       typeProperties: ["familyName", "givenName", "digitalIdentifier"] },
  { openMindsType: "Organization", typeProperties: ["fullName"] },
  { openMindsType: "Consortium",   typeProperties: ["fullName"] },
  {
    openMindsType:  "Funding",
    typeProperties: ["awardTitle", "awardNumber", "funder"],
    stage:          "RELEASED",
    space:          "common",
  },
]

// ── IN_PROGRESS config — requires personal token ──────────────────────────────
const configInProgress = [
  {
    openMindsType:  "Funding",
    typeProperties: ["awardTitle", "awardNumber", "funder"],
    stage:          "IN_PROGRESS",
    space:          "common",
  },
]

// ── build request options using service credentials ───────────────────────────
async function buildServiceRequestOptions() {
  const token = await getServiceToken()
  return {
    method:  'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept':        'application/json',
    }
  }
}

// ── main export — called from index.js every 24h ──────────────────────────────
export default async function fetchDataFromKg() {
  try {
    console.log('fetchDataFromKg: starting full data refresh…')

    // get service token once for the whole refresh cycle
    const requestOptions = await buildServiceRequestOptions()

    // fetch all RELEASED data + IN_PROGRESS funding in one pass
    const fullConfig = [...configReleased, ...configInProgress]

    await fetchLicenses()
    await fetchCoreSchemaInstances(fullConfig, requestOptions)
    await fetchControlledTerms()
    await fetchStudyTargets()
    await fetchTechniques()
    await fetchFunders()

    console.log('fetchDataFromKg: full data refresh complete')
  } catch (error) {
    console.error('fetchDataFromKg: error during refresh:', error.message)
  }
}