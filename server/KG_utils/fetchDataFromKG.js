import fetchControlledTerms from './fetchControlledTerms.js'
import { fetchCoreSchemaInstances } from './fetchCoreSchemaInstances.js'
import { fetchLicenses } from './fetchLicenses.js'
import fetchStudyTargets from './fetchStudyTargets.js'
import fetchTechniques from './fetchTechniques.js'
import fetchFunders from './fetchFunders.js'

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

const configInProgress = [
  {
    openMindsType:  "Funding",
    typeProperties: ["awardTitle", "awardNumber", "funder"],
    stage:          "IN_PROGRESS",
    space:          "common",
  },
]

// ── runs at startup every 24h — no personal token needed ─────────────────────
export default async function fetchDataFromKg() {
  try {
    console.log('fetchDataFromKg: starting…')
    await fetchLicenses()
    await fetchCoreSchemaInstances(configReleased)
    await fetchControlledTerms()
    await fetchStudyTargets()
    await fetchTechniques()
    await fetchFunders()
    console.log('fetchDataFromKg: complete')
  } catch (error) {
    console.error('fetchDataFromKg error:', error.message)
  }
}

// ── runs once after first login — uses personal token already set ─────────────
let _done = false

export async function fetchFundingInProgress() {
  if (_done) return
  try {
    console.log('fetchFundingInProgress: fetching IN_PROGRESS funding…')
    // fetchCoreSchemaInstances with no requestOptions argument
    // will call getRequestOptions() internally which reads from tokenFunctions
    // — personal token is already set at this point from auth.js
    await fetchCoreSchemaInstances(configInProgress)
    await fetchFunders()
    _done = true
    console.log('fetchFundingInProgress: done')
  } catch (error) {
    console.error('fetchFundingInProgress error:', error.message)
  }
}

export function resetFundingInProgressFlag() {
  _done = false
}