import fetchControlledTerms from './fetchControlledTerms.js'
import {fetchCoreSchemaInstances} from './fetchCoreSchemaInstances.js'
import { fetchLicenses } from './fetchLicenses.js'

const configObject = [
    {
        openMindsType: "Person",
        typeProperties: ["familyName", "givenName"]
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
        typeProperties: ["awardTitle", "awardNumber", "funder"]
    },
]

/*export default async function fetchDataFromKg() {
    console.log('Fetching data from KG')
    await Promise.all( [fetchCoreSchemaInstances(configObject), fetchControlledTerms()] )
}*/

/*try {
    await fetchCoreSchemaInstances(configObject)
    //await fetchControlledTerms()
} catch (error) {
    console.log("error running fetchCoreSchemaInstances", error)
}*/

export default async function fetchDataFromKg() {
    try {
        await fetchLicenses()
        await fetchCoreSchemaInstances(configObject)
        await fetchControlledTerms()
    } catch (error) {
        console.log("error running fetchCoreSchemaInstances", error)
    }
}