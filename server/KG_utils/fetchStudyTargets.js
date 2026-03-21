import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { writeFile } from 'fs/promises'
import { getRequestOptions } from './kgAuthentication.js'
import { studyTargetTerms } from './constants.js'

const API_BASE_URL = "https://core.kg.ebrains.eu/"
const API_ENDPOINT = "v3/instances"
const OPENMINDS_VOCAB = "https://openminds.om-i.org/props"
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'studyTargets')

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

fs.mkdir(OUTPUT_DIR, { recursive: true }, (err) => {
    if (err && err.code !== 'EEXIST') console.error(err)
    else console.log('Study targets output directory ready.')
})

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export default async function fetchStudyTargets() {
    const requestOptions = await getRequestOptions()
    const allTerms = [...studyTargetTerms]

    const fetchPromises = allTerms.map(async (term) => {
        const queryParams = ["stage=RELEASED", "space=controlled",
                             "type=https://openminds.om-i.org/types/"]
        const queryUrl = `${API_BASE_URL}${API_ENDPOINT}?${queryParams.join("&")}${term}`
        return fetchWithRetry(queryUrl, requestOptions, term)
    })

    const results = await Promise.all(fetchPromises)

    // ── merge all results into one flat sorted list, tagged with type ────────
    const merged = results
        .flat()
        .filter(item => item !== null)
        .sort((a, b) => {
            // sort first by type label, then by name within each type
            const typeCompare = a.type.localeCompare(b.type)
            return typeCompare !== 0 ? typeCompare : a.name.localeCompare(b.name)
        })

    const filePath = path.join(OUTPUT_DIR, 'studyTargets.json')
    await writeFile(filePath, JSON.stringify(merged, null, 2))
    console.log(`Study targets file written: ${merged.length} entries across ${allTerms.length} types`)
}

// ── retry wrapper ─────────────────────────────────────────────────────────────
async function fetchWithRetry(url, requestOptions, term) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`Fetching StudyTarget/${term} (attempt ${attempt}/${MAX_RETRIES})...`)
            const result = await fetchInstances(url, requestOptions, term)
            return result
        } catch (error) {
            const isLastAttempt = attempt === MAX_RETRIES
            if (isLastAttempt) {
                console.error(`Failed to fetch ${term} after ${MAX_RETRIES} attempts:`, error.message)
                return []  // return empty so other types still succeed
            } else {
                console.warn(`Attempt ${attempt} failed for ${term}. Retrying in ${RETRY_DELAY_MS}ms...`)
                await sleep(RETRY_DELAY_MS)
            }
        }
    }
}

async function fetchInstances(apiQueryUrl, requestOptions, term) {
    const response = await fetch(apiQueryUrl, requestOptions)
    if (response.status === 200) {
        const data = await response.json()
        return parseInstances(data, term)
    } else {
        throw new Error(`Error fetching ${term}. Status code: ${response.status}`)
    }
}

function parseInstances(data, typeName) {
    const instances = []
    for (let instance of (data.data || [])) {
        const name = instance[`${OPENMINDS_VOCAB}/name`]
        if (!name) continue  // skip instances without a name
        instances.push({
            identifier: instance["@id"],
            name,
            type: typeName   // tag with type so frontend can group them
        })
    }
    return instances
}