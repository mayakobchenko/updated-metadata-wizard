import fetchControlledTerms from './fetchControlledTerms.js'
import { fetchCoreSchemaInstances } from './fetchCoreSchemaInstances.js'
import { fetchLicenses } from './fetchLicenses.js'
import fetchStudyTargets from './fetchStudyTargets.js'
import fetchTechniques from './fetchTechniques.js'
import fetchFunders from './fetchFunders.js'
import { getRequestOptions } from './kgAuthentication.js'
import logger from '../logger.js'

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

// The reference data (people, organisations, terms, licences ...) is written to files after the server has started.
// Requests that need those files wait for the FIRST run, but never longer than KG_WAIT_MS, so the wizard never hangs.
let markReady
const firstRunDone = new Promise((resolve) => { markReady = resolve })
let ready = false
export const isKgDataReady = () => ready
export async function waitForKgData(maxMs = parseInt(process.env.KG_WAIT_MS || '45000', 10)) {
  if (ready) return 'ready'
  let timer
  const timeout = new Promise((resolve) => { timer = setTimeout(() => resolve('timeout'), maxMs) })
  const result = await Promise.race([firstRunDone.then(() => 'ready'), timeout])
  clearTimeout(timer)
  return result
}

export default async function fetchDataFromKg() {
  try {
    logger.info('fetchDataFromKg: starting…')
    await fetchLicenses()
    await fetchCoreSchemaInstances(configReleased)
    await fetchControlledTerms()
    await fetchStudyTargets()
    await fetchTechniques()
    await fetchFunders()
    logger.info('fetchDataFromKg: complete')
  } catch (error) {
    console.error('fetchDataFromKg error:', error.message)
  } finally {
    ready = true        // after a failed first run the wizard works with what is on disk instead of waiting again
    markReady()
  }
}

let _done = false

export async function fetchFundingInProgress() {
  if (_done) return
  try {
    //console.log('fetchFundingInProgress: fetching IN_PROGRESS funding…')

    // ── explicitly get the request options NOW — token is set at this point ──
    const requestOptions = await getRequestOptions()
    //console.log('fetchFundingInProgress: got request options, fetching…')

    // ── fetch IN_PROGRESS instances using the personal token ─────────────────
    const instances = await fetchCoreSchemaInstances(configInProgress, requestOptions)
    //console.log('fetchFundingInProgress: fetch complete')

    // ── only update Funders.json if we actually got results ───────────────────
    // This prevents wiping the RELEASED data if IN_PROGRESS returns 0
    await fetchFunders()

    _done = true
    //console.log('fetchFundingInProgress: done')
  } catch (error) {
    console.error('fetchFundingInProgress error:', error.message)
  }
}

export function resetFundingInProgressFlag() {
  _done = false
}