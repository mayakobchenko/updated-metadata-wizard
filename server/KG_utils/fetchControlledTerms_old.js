import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { writeFile } from 'fs/promises'
import { getRequestOptions } from './kgAuthentication.js'
import { subjectProperties } from './constants.js'

const API_BASE_URL = "https://core.kg.ebrains.eu/"
const API_ENDPOINT = "v3/instances"
const QUERY_PARAMS = ["stage=RELEASED", "space=controlled", "type=https://openminds.om-i.org/types/"]
const OPENMINDS_VOCAB = "https://openminds.om-i.org/props"
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'controlledTerms')

fs.mkdir(OUTPUT_DIR, { recursive: true }, (err) => {
    if (err) {
        if (err.code === 'EEXIST') {
            console.log("Directory already exists.")
        } else { console.log(err) }
    } else { console.log("New directory for controlled terms successfully created.") }
})

export default async function fetchControlledTerms() {
    const requestOptions = await getRequestOptions()
    const MAIN_TERMS = ["PreparationType", "Technique", "ContributionType",
        "SemanticDataType", "ExperimentalApproach"]
    const CONTROLLED_TERMS = MAIN_TERMS.concat(subjectProperties)

    // ── Species must complete before Strain runs ──────────────────────────
    const speciesUrl = `${API_BASE_URL}${API_ENDPOINT}?${QUERY_PARAMS.join("&")}Species`
    await fetchInstances(speciesUrl, requestOptions, "Species")

    // ── all other terms (including Strain) can now run in parallel ────────
    const remainingTerms = CONTROLLED_TERMS.filter(term => term !== "Species")
    const fetchPromises = remainingTerms.map(async (term) => {
        const queryUrl = `${API_BASE_URL}${API_ENDPOINT}?${QUERY_PARAMS.join("&")}${term}`
        try {
            await fetchInstances(queryUrl, requestOptions, term)
        } catch (error) {
            console.error(`Error fetching instances for ${term}:`, error)
        }
    })
    await Promise.all(fetchPromises)
}

async function fetchInstances(apiQueryUrl, requestOptions, controlledTerm) {
    try {
        const response = await fetch(apiQueryUrl, requestOptions)
        if (response.status === 200) {
            const data = await response.json()
            await parseAndSaveData(data, controlledTerm)
        } else {
            throw new Error(`Error fetching instances for ${controlledTerm}. Status code: ${response.status}`)
        }
    } catch (error) {
        console.log(`Error fetching instances for ${controlledTerm}:`, error)
    }
}

async function parseAndSaveData(data, instanceName) {
    let instanceList = []
    try {
        // ── load Species.json once for Strain enrichment ──────────────────
        let speciesData
        if (instanceName === "Strain") {
            speciesData = await loadJsonFile(path.join(OUTPUT_DIR, 'Species.json'))
        }

        for (let thisInstance of data.data) {
            //console.log('thisInstance:',thisInstance)
            let newInstance = {
                identifier: thisInstance["@id"],
                name: thisInstance[`${OPENMINDS_VOCAB}/name`]
            }

            // ── enrich Strain: resolve species @id → species name ─────────
            if (instanceName === "Strain") {
                console.log('thisInstance:',thisInstance)
                const speciesRef = thisInstance[`${OPENMINDS_VOCAB}/species`]
                console.log('speciesRef',speciesRef)
                if (speciesRef !== undefined) {
                    const speciesId = speciesRef["@id"]
                    console.log('spicesId', speciesId)
                    const matchedSpecies = speciesData.find(s => s.identifier === speciesId)
                    if (matchedSpecies !== undefined) {
                        newInstance["species"] = speciesRef["@id"]
                    }
                }
            }

            instanceList.push(newInstance)
        }

        instanceList.sort((a, b) => a.name.localeCompare(b.name))
        const filePath = path.join(OUTPUT_DIR, `${instanceName}.json`)
        await writeFile(filePath, JSON.stringify(instanceList, null, 2))
        console.log(`File with instances for ${instanceName} written successfully`)

    } catch (error) {
        console.error(`Error while parsing and saving data for ${instanceName}:`, error)
    }
}

async function loadJsonFile(filePath) {
    try {
        const data = await fs.promises.readFile(filePath, 'utf8')
        return JSON.parse(data)
    } catch (err) {
        console.error('Error reading the file:', err)
        throw err
    }
}