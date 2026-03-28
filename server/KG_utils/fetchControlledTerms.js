import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { writeFile } from 'fs/promises'
import { getRequestOptions } from './kgAuthentication.js'
import { subjectProperties } from './constants.js'
import { Techniques } from './constants.js'

const API_BASE_URL = "https://core.kg.ebrains.eu/"
const API_ENDPOINT = "v3/instances"
const QUERY_PARAMS = ["stage=RELEASED", "space=controlled", "type=https://openminds.om-i.org/types/"]
const STRAIN_QUERY_PARAMS = ["stage=RELEASED", "space=dataset", "type=https://openminds.om-i.org/types/"]
const OPENMINDS_VOCAB = "https://openminds.om-i.org/props"
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'controlledTerms')

const MAX_RETRIES = 3        // maximum number of attempts
const RETRY_DELAY_MS = 1000  // wait 1 second between retries

fs.mkdir(OUTPUT_DIR, { recursive: true }, (err) => {
    if (err) {
        if (err.code === 'EEXIST') {
            console.log("Directory already exists.")
        } else { console.log(err) }
    } else { console.log("New directory for controlled terms successfully created.") }
})

export default async function fetchControlledTerms() {
    const requestOptions = await getRequestOptions()
    //const MAIN_TERMS = ["PreparationType", "Technique", "ContributionType", "SemanticDataType", "ExperimentalApproach"]
    const MAIN_TERMS = ["PreparationType", "ContributionType",
        "SemanticDataType", "ExperimentalApproach"]
    const CONTROLLED_TERMS = [...MAIN_TERMS, ...subjectProperties, ...Techniques,]
    //const CONTROLLED_TERMS = MAIN_TERMS.concat(subjectProperties).concat(Techniques)

    // ── Species must complete before Strain runs ──────────────────────────
    const speciesUrl = `${API_BASE_URL}${API_ENDPOINT}?${QUERY_PARAMS.join("&")}Species`
    await fetchWithRetry(speciesUrl, requestOptions, "Species")

    // ── all other terms (including Strain) can now run in parallel ────────
    const remainingTerms = CONTROLLED_TERMS.filter(term => term !== "Species")
    const fetchPromises = remainingTerms.map(async (term) => {
        const queryParams = term === "Strain" ? STRAIN_QUERY_PARAMS : QUERY_PARAMS
        const queryUrl = `${API_BASE_URL}${API_ENDPOINT}?${queryParams.join("&")}${term}`
        await fetchWithRetry(queryUrl, requestOptions, term)
    })
    await Promise.all(fetchPromises)
}

// ── retry wrapper ─────────────────────────────────────────────────────────────
async function fetchWithRetry(url, requestOptions, controlledTerm) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`Fetching ${controlledTerm} (attempt ${attempt}/${MAX_RETRIES})...`)
            await fetchInstances(url, requestOptions, controlledTerm)
            return  // success — exit the retry loop
        } catch (error) {
            const isLastAttempt = attempt === MAX_RETRIES
            if (isLastAttempt) {
                console.error(`Failed to fetch ${controlledTerm} after ${MAX_RETRIES} attempts:`, error.message)
            } else {
                console.warn(`Attempt ${attempt} failed for ${controlledTerm}. Retrying in ${RETRY_DELAY_MS}ms...`)
                await sleep(RETRY_DELAY_MS)
            }
        }
    }
}

// ── sleep helper ──────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function fetchInstances(apiQueryUrl, requestOptions, controlledTerm) {
    const response = await fetch(apiQueryUrl, requestOptions)
    if (response.status === 200) {
        const data = await response.json()
        await parseAndSaveData(data, controlledTerm)
    } else {
        // throw so the retry wrapper catches it
        throw new Error(`Error fetching instances for ${controlledTerm}. Status code: ${response.status}`)
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
            let newInstance = {
                identifier: thisInstance["@id"],
                name: thisInstance[`${OPENMINDS_VOCAB}/name`]
            }

            if (instanceName === "preparationType") { 
                console.log("preparationType:", thisInstance)
            }
            // ── enrich Strain: resolve species @id → species identifier ───
            if (instanceName === "Strain") {
                const speciesRef = thisInstance[`${OPENMINDS_VOCAB}/species`]
                if (speciesRef !== undefined) {
                    const speciesId = speciesRef["@id"]
                    const matchedSpecies = speciesData.find(s => s.identifier === speciesId)
                    if (matchedSpecies !== undefined) {
                        newInstance["species"] = matchedSpecies.identifier
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