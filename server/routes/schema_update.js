//import fetchControlledTerms from '../KG_utils/fetchControlledTerms'
import { fetchCoreSchemaInstances } from '../KG_utils/fetchCoreSchemaInstances.js'

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

    // Temporary to retrieve strains for the workbench:
    // configObject = {
    //     openMindsType: "Strain",
    //     typeProperties: ["name", "description"],
    //     space: "dataset"
    // }


export default async function fetchDataFromKg() {
    console.log('fetchCoreSchemaInstances')
    console.log(configObject)
    await fetchCoreSchemaInstances(configObject)
    //await fetchControlledTerms()
}

fetchDataFromKg()