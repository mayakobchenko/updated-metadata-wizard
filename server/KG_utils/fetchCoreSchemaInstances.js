import fs from 'fs'
import path from 'path'
import { getRequestOptions } from './kgAuthentication.js'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)
const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'kg-instances')
const OPENMINDS_VOCAB = "https://openminds.om-i.org/props"
const API_BASE_URL    = "https://core.kg.ebrains.eu/"
const API_ENDPOINT    = "v3/instances"

fs.mkdir(OUTPUT_DIR, { recursive: true }, (err) => {
  if (err) {
    if (err.code === 'EEXIST') { console.log("Directory already exists.") }
    else { console.log(err) }
  } else { console.log("New directory successfully created.") }
})

export const fetchCoreSchemaInstances = async (typeSpecifications) => {
  const requestOptions = await getRequestOptions()

  // ── group specs by output filename so we can merge multiple fetches ────────
  // e.g. two Funding specs (RELEASED + IN_PROGRESS) both write to Funding.json
  const resultsByFile = new Map()   // filename → accumulated instance array

  const fetchPromises = typeSpecifications.map(async (typeSpecification) => {
    const spaceName = typeSpecification.space ?? "common"
    const stageName = typeSpecification.stage ?? "RELEASED"   // ← new, default RELEASED
    const TYPE_NAME = typeSpecification.openMindsType
    const QUERY_PARAMS = [
      `stage=${stageName}`,
      `space=${spaceName}`,
      "type=https://openminds.om-i.org/types/"
    ]
    const queryUrl = `${API_BASE_URL}${API_ENDPOINT}?${QUERY_PARAMS.join("&")}${TYPE_NAME}`

    try {
      const instances = await fetchAndParseInstances(
        queryUrl, requestOptions, TYPE_NAME, typeSpecification.typeProperties
      )
      // accumulate into the map keyed by type name (= output filename)
      if (!resultsByFile.has(TYPE_NAME)) {
        resultsByFile.set(TYPE_NAME, [])
      }
      resultsByFile.get(TYPE_NAME).push(...instances)
    } catch (error) {
      console.error(`Error fetching instances for ${TYPE_NAME} (${stageName}):`, error)
    }
  })

  await Promise.all(fetchPromises)

  // ── write one file per type, deduplicating by uuid ─────────────────────────
  for (const [typeName, instances] of resultsByFile.entries()) {
    const deduped  = deduplicateByUuid(instances)
    const jsonStr  = JSON.stringify(deduped, null, 2)
    const filePath = path.join(OUTPUT_DIR, `${typeName}.json`)
    await fs.promises.writeFile(filePath, jsonStr)
    console.log(`File with instances for ${typeName} written successfully (${deduped.length} entries)`)
  }
}

// ── returns parsed instances array without writing to disk ────────────────────
async function fetchAndParseInstances(apiQueryUrl, requestOptions, typeName, propertyNames) {
  try {
    const response = await fetch(apiQueryUrl, requestOptions)
    if (response.status === 200) {
      const data = await response.json()
      return await parseInstances(data, typeName, propertyNames)
    } else {
      throw new Error(`Error fetching instances for ${typeName}. Status: ${response.status}`)
    }
  } catch (error) {
    console.log(`Error fetching instances for ${typeName}:`, error)
    return []
  }
}

// ── parse raw KG response into a flat array of instance objects ───────────────
async function parseInstances(data, typeName, propertyNameList) {
  const typeInstanceList = []
  try {
    let orcidData
    if (typeName === "Person") {
      orcidData = await loadJsonFile(path.join(OUTPUT_DIR, `ORCID.json`))
    }

    for (const thisInstance of data.data) {
      const newInstance = { "uuid": thisInstance["@id"] }
      let isEmpty = true

      for (const propertyName of propertyNameList) {
        const vocabName = `${OPENMINDS_VOCAB}/${propertyName}`
        if (thisInstance[vocabName] !== undefined) {
          isEmpty = false
          if (typeName === "Person" && propertyName === "digitalIdentifier") {
            const findOrcid = orcidData?.find(
              entry => entry.uuid === thisInstance[`${OPENMINDS_VOCAB}/digitalIdentifier`]["@id"]
            )
            if (findOrcid !== undefined) {
              newInstance["orcid"] = findOrcid["identifier"]
            }
          } else {
            newInstance[propertyName] = thisInstance[vocabName]
          }
        }
      }

      // also capture revision — it lives under a different vocab namespace
      const revisionKey = 'https://core.kg.ebrains.eu/vocab/meta/revision'
      if (thisInstance[revisionKey]) {
        newInstance['revision'] = thisInstance[revisionKey]
      }

      if (!isEmpty) {
        typeInstanceList.push(newInstance)
      }
    }
  } catch (error) {
    console.error(`Error while parsing data for ${typeName}:`, error)
  }
  return typeInstanceList
}

// ── deduplicate by uuid — last entry wins (IN_PROGRESS overrides RELEASED) ────
function deduplicateByUuid(instances) {
  const byUuid = new Map()
  for (const instance of instances) {
    byUuid.set(instance.uuid, instance)
  }
  return [...byUuid.values()]
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