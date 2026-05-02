import fetchControlledTerms from './fetchControlledTerms.js'
import { fetchCoreSchemaInstances } from './fetchCoreSchemaInstances.js'
import { fetchLicenses } from './fetchLicenses.js'
import fetchStudyTargets from './fetchStudyTargets.js'
import fetchTechniques from './fetchTechniques.js'
import fetchFunders from './fetchFunders.js'
import { getRequestOptions } from './kgAuthentication.js'

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

let _done = false

export async function fetchFundingInProgress() {
  if (_done) return
  try {
    console.log('fetchFundingInProgress: fetching IN_PROGRESS funding…')

    // ── explicitly get the request options NOW — token is set at this point ──
    const requestOptions = await getRequestOptions()
    console.log('fetchFundingInProgress: got request options, fetching…')

    // ── fetch IN_PROGRESS instances using the personal token ─────────────────
    const instances = await fetchCoreSchemaInstances(configInProgress, requestOptions)
    console.log('fetchFundingInProgress: fetch complete')

    // ── only update Funders.json if we actually got results ───────────────────
    // This prevents wiping the RELEASED data if IN_PROGRESS returns 0
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