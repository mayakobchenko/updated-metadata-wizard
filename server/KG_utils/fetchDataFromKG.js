import fetchControlledTerms from './fetchControlledTerms.js'
import {fetchCoreSchemaInstances} from './fetchCoreSchemaInstances.js'
import { fetchLicenses } from './fetchLicenses.js'
import fetchStudyTargets from './fetchStudyTargets.js'
import fetchTechniques from './fetchTechniques.js'
import fetchFunders from './fetchFunders.js'

const configObject = [
    {
        openMindsType: "ORCID",
        typeProperties: ["identifier"]
    },
    {
        openMindsType: "Person",
        typeProperties: ["familyName", "givenName", "digitalIdentifier"] //@id  /&digitalIdentifier
    },
    {
        openMindsType: "Organization",
        typeProperties: ["fullName"]
    },
    {
        openMindsType: "Consortium",
        typeProperties: ["fullName"]
    },
    {
        openMindsType: "Funding",
        typeProperties: ["identifier", "awardTitle", "awardNumber", "revision", "funder"]
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
        console.log("error running fetchCoreSchemaInstances", error)
    }
}