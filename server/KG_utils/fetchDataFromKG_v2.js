import fetchControlledTerms from './fetchControlledTerms.js'
import { fetchCoreSchemaInstances } from './fetchCoreSchemaInstances.js'
import { fetchLicenses } from './fetchLicenses.js'
import fetchStudyTargets from './fetchStudyTargets.js'
import fetchTechniques from './fetchTechniques.js'
import fetchFunders from './fetchFunders.js'

const configObject = [
  { openMindsType: "ORCID",        typeProperties: ["identifier"] },
  { openMindsType: "Person",       typeProperties: ["familyName", "givenName", "digitalIdentifier"] },
  { openMindsType: "Organization", typeProperties: ["fullName"] },
  { openMindsType: "Consortium",   typeProperties: ["fullName"] },
  // ── Funding fetched from both stages, merged into one Funding.json ──────────
  {
    openMindsType:  "Funding",
    typeProperties: ["awardTitle", "awardNumber", "funder"],
    stage: "RELEASED",
    space: "common",
  },
  {
    openMindsType:  "Funding",
    typeProperties: ["awardTitle", "awardNumber", "funder"],
    stage: "IN_PROGRESS",
    space: "common",
  },
]

export default async function fetchDataFromKg() {
  try {
    await fetchLicenses()
    await fetchCoreSchemaInstances(configObject)
    await fetchControlledTerms()
    await fetchStudyTargets()
    await fetchTechniques()
    await fetchFunders()
  } catch (error) {
    console.log("error running fetchDataFromKg:", error)
  }
}