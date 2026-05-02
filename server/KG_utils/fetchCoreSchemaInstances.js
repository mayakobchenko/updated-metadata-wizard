import fs from 'fs'
import path from 'path'
import { getRequestOptions } from './kgAuthentication.js'
import { fileURLToPath } from 'url'

const __filename      = fileURLToPath(import.meta.url)
const __dirname       = path.dirname(__filename)
const OUTPUT_DIR      = path.join(__dirname, '..', 'data', 'kg-instances')
const OPENMINDS_VOCAB = "https://openminds.om-i.org/props"
const API_BASE_URL    = "https://core.kg.ebrains.eu/"
const API_ENDPOINT    = "v3/instances"

fs.mkdir(OUTPUT_DIR, { recursive: true }, (err) => {
  if (err && err.code !== 'EEXIST') { console.log(err) }
  else { console.log("New directory successfully created.") }
})

export const fetchCoreSchemaInstances = async (typeSpecifications, requestOptions = null) => {
  if (!requestOptions) {
    requestOptions = await getRequestOptions()
  }

  // ── ORCID must be fetched first because Person depends on it ──────────────
  const orcidSpec = typeSpecifications.find(s => s.openMindsType === 'ORCID')
  if (orcidSpec) {
    const stageName   = orcidSpec.stage ?? "RELEASED"
    const spaceName   = orcidSpec.space ?? "common"
    const QUERY_PARAMS = [`stage=${stageName}`, `space=${spaceName}`, "type=https://openminds.om-i.org/types/"]
    const queryUrl    = `${API_BASE_URL}${API_ENDPOINT}?${QUERY_PARAMS.join("&")}ORCID`
    const instances   = await fetchAndParseInstances(queryUrl, requestOptions, 'ORCID', orcidSpec.typeProperties)
    const filePath    = path.join(OUTPUT_DIR, 'ORCID.json')
    await fs.promises.writeFile(filePath, JSON.stringify(instances, null, 2))
    console.log(`File with instances for ORCID written successfully (${instances.length} entries)`)
  }

  // ── all other types fetched in parallel, grouped by type name ────────────
  const otherSpecs = typeSpecifications.filter(s => s.openMindsType !== 'ORCID')

  // group specs by type name so multiple stages accumulate into one file
  const resultsByType = new Map()

  const fetchPromises = otherSpecs.map(async (typeSpecification) => {
    const spaceName = typeSpecification.space ?? "common"
    const stageName = typeSpecification.stage ?? "RELEASED"
    const TYPE_NAME = typeSpecification.openMindsType
    const QUERY_PARAMS = [
      `stage=${stageName}`,
      `space=${spaceName}`,
      "type=https://openminds.om-i.org/types/"
    ]
    const queryUrl = `${API_BASE_URL}${API_ENDPOINT}?${QUERY_PARAMS.join("&")}${TYPE_NAME}`

    console.log(`Fetching ${TYPE_NAME} stage=${stageName} space=${spaceName}…`)

    try {
    const instances = await fetchAndParseInstances(
      queryUrl, requestOptions, TYPE_NAME, typeSpecification.typeProperties
    )
    console.log(`  → ${instances.length} instances for ${TYPE_NAME} (${stageName})`)
    if (!resultsByType.has(TYPE_NAME)) resultsByType.set(TYPE_NAME, [])
    resultsByType.get(TYPE_NAME).push(...instances)
    } catch (error) {
      console.error(`Error fetching ${TYPE_NAME} (${stageName}):`, error)
    }
  })

  await Promise.all(fetchPromises)

  // ── write one file per type, deduplicating by uuid ────────────────────────
  for (const [typeName, instances] of resultsByType.entries()) {
    const deduped  = deduplicateByUuid(instances)
    const filePath = path.join(OUTPUT_DIR, `${typeName}.json`)
    await fs.promises.writeFile(filePath, JSON.stringify(deduped, null, 2))
    console.log(`File with instances for ${typeName} written successfully (${deduped.length} entries)`)
  }
}

// ── fetch from KG and return parsed instance array (does not write to disk) ──
async function fetchAndParseInstances(apiQueryUrl, requestOptions, typeName, propertyNames) {
  try {
    const response = await fetch(apiQueryUrl, requestOptions)
    if (response.status === 200) {
      const data = await response.json()
      return await parseInstances(data, typeName, propertyNames)
    } else {
      throw new Error(`Status ${response.status} for ${typeName}`)
    }
  } catch (error) {
    console.log(`Error fetching instances for ${typeName}:`, error)
    return []
  }
}

// ── parse raw KG response into flat array of instance objects ────────────────
async function parseInstances(data, typeName, propertyNameList) {
  const typeInstanceList = []
  try {
    let orcidData
    if (typeName === "Person") {
      orcidData = await loadJsonFile(path.join(OUTPUT_DIR, 'ORCID.json'))
    }

    for (const thisInstance of data.data) {
      const newInstance = { uuid: thisInstance["@id"] }

      for (const propertyName of propertyNameList) {
        const vocabName = `${OPENMINDS_VOCAB}/${propertyName}`
        if (thisInstance[vocabName] !== undefined) {
          if (typeName === "Person" && propertyName === "digitalIdentifier") {
            const findOrcid = orcidData?.find(
              entry => entry.uuid === thisInstance[`${OPENMINDS_VOCAB}/digitalIdentifier`]?.["@id"]
            )
            if (findOrcid !== undefined) {
              newInstance["orcid"] = findOrcid["identifier"]
            }
          } else {
            newInstance[propertyName] = thisInstance[vocabName]
          }
        }
      }

      // capture revision separately — different vocab namespace
      const revisionKey = 'https://core.kg.ebrains.eu/vocab/meta/revision'
      if (thisInstance[revisionKey]) {
        newInstance['revision'] = thisInstance[revisionKey]
      }

      // ── always keep the entry if it has a uuid ────────────────────────────
      // Previously isEmpty check dropped entries with only funder + no title.
      // Now we keep everything that has a valid @id.
      typeInstanceList.push(newInstance)
    }
  } catch (error) {
    console.error(`Error while parsing data for ${typeName}:`, error)
  }
  return typeInstanceList
}

// ── deduplicate by uuid — last entry wins (IN_PROGRESS overrides RELEASED) ───
function deduplicateByUuid(instances) {
  const byUuid = new Map()
  for (const instance of instances) byUuid.set(instance.uuid, instance)
  return [...byUuid.values()]
}

async function loadJsonFile(filePath) {
  const data = await fs.promises.readFile(filePath, 'utf8')
  return JSON.parse(data)
}