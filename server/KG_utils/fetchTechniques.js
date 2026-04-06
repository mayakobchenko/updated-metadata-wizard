import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { writeFile } from 'fs/promises'
import { getRequestOptions } from './kgAuthentication.js'
import { Techniques } from './constants.js'

const API_BASE_URL    = "https://core.kg.ebrains.eu/"
const API_ENDPOINT    = "v3/instances"
const OPENMINDS_VOCAB = "https://openminds.om-i.org/props"
const __filename      = fileURLToPath(import.meta.url)
const __dirname       = path.dirname(__filename)
const OUTPUT_DIR      = path.join(__dirname, '..', 'data', 'techniques')
const MAX_RETRIES     = 3
const RETRY_DELAY_MS  = 1000

fs.mkdir(OUTPUT_DIR, { recursive: true }, (err) => {
    if (err && err.code !== 'EEXIST') console.error(err)
    else console.log('Techniques output directory ready.')
})

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export default async function fetchTechniques() {
    const requestOptions = await getRequestOptions()

    const fetchPromises = Techniques.map(async (term) => {
        const queryParams = [
            "stage=RELEASED",
            "space=controlled",
            "type=https://openminds.om-i.org/types/"
        ]
        const queryUrl = `${API_BASE_URL}${API_ENDPOINT}?${queryParams.join("&")}${term}`
        return fetchWithRetry(queryUrl, requestOptions, term)
    })

    const results = await Promise.all(fetchPromises)

    const merged = results
        .flat()
        .filter(item => item !== null)
        .sort((a, b) => {
            const typeCompare = a.type.localeCompare(b.type)
            return typeCompare !== 0 ? typeCompare : a.name.localeCompare(b.name)
        })

    const filePath = path.join(OUTPUT_DIR, 'techniques.json')
    await writeFile(filePath, JSON.stringify(merged, null, 2))
    console.log(`Techniques file written: ${merged.length} entries across ${Techniques.length} types`)
    return merged
}

async function fetchWithRetry(url, requestOptions, term) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`Fetching Technique/${term} (attempt ${attempt}/${MAX_RETRIES})...`)
            return await fetchInstances(url, requestOptions, term)
        } catch (error) {
            const isLastAttempt = attempt === MAX_RETRIES
            if (isLastAttempt) {
                console.error(`Failed to fetch ${term} after ${MAX_RETRIES} attempts:`, error.message)
                return []
            } else {
                console.warn(`Attempt ${attempt} failed for ${term}. Retrying in ${RETRY_DELAY_MS}ms...`)
                await sleep(RETRY_DELAY_MS)
            }
        }
    }
}

async function fetchInstances(apiQueryUrl, requestOptions, term) {
    const response = await fetch(apiQueryUrl, requestOptions)
    if (response.status !== 200) {
        throw new Error(`Error fetching ${term}. Status: ${response.status}`)
    }
    const data = await response.json()
    return (data.data || [])
        .filter(instance => instance[`${OPENMINDS_VOCAB}/name`])
        .map(instance => ({
            identifier: instance["@id"],
            name:       instance[`${OPENMINDS_VOCAB}/name`],
            type:       term
        }))
}