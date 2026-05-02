import { readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { getRequestOptions } from './kgAuthentication.js'

const __filename   = fileURLToPath(import.meta.url)
const __dirname    = path.dirname(__filename)
const FUNDING_PATH = path.join(__dirname, 'data/kg-instances/Funding.json')
const OUTPUT_PATH  = path.join(__dirname, 'data/kg-instances/Funders.json')

export default async function fetchFunders() {
  console.log('fetchFunders: starting…')

  // ── 1. read Funding.json (written by fetchCoreSchemaInstances) ────────────
  // Structure: [{ uuid, awardTitle, awardNumber, funder: {"@id": "..."} }, ...]
  let funding = []
  try {
    const raw = await readFile(FUNDING_PATH, 'utf-8')
    funding   = JSON.parse(raw)
  } catch (err) {
    console.error('fetchFunders: could not read Funding.json:', err.message)
    return
  }

  // ── 2. collect unique funder @ids ─────────────────────────────────────────
  const uniqueFunderIds = [...new Set(
    funding
      .map(f => f.funder?.['@id'])
      .filter(Boolean)
  )]

  if (uniqueFunderIds.length === 0) {
    console.warn('fetchFunders: no funder IDs found in Funding.json')
    return
  }

  console.log(`fetchFunders: fetching ${uniqueFunderIds.length} unique funders from KG…`)

  // ── 3. fetch each funder Organisation/Consortium from KG ─────────────────
  const requestOptions = await getRequestOptions()

  const results = await Promise.allSettled(
    uniqueFunderIds.map(async (funderUrl) => {
      const uuid   = funderUrl.split('/').pop()
      const apiUrl = `https://core.kg.ebrains.eu/v3/instances/${uuid}?stage=RELEASED`

      try {
        const resp = await fetch(apiUrl, requestOptions)
        if (!resp.ok) {
          console.warn(`fetchFunders: ${uuid} → ${resp.status}`)
          return { id: funderUrl, uuid, name: null }
        }
        const data = await resp.json()
        // Organisation and Consortium both use fullName
        const name =
          data.data?.['https://openminds.om-i.org/props/fullName']  ||
          data.data?.['https://openminds.ebrains.eu/vocab/fullName'] ||
          data.data?.['https://openminds.om-i.org/props/shortName'] ||
          null

        console.log(`fetchFunders: ${uuid} → "${name}"`)
        return { id: funderUrl, uuid, name }

      } catch (err) {
        console.error(`fetchFunders: error fetching ${uuid}:`, err.message)
        return { id: funderUrl, uuid, name: null }
      }
    })
  )

  // ── 4. build and save Funders.json ────────────────────────────────────────
  const funders = results
    .filter(r => r.status === 'fulfilled' && r.value?.name)
    .map(r => r.value)
    .sort((a, b) => a.name.localeCompare(b.name))

  try {
    await mkdir(path.dirname(OUTPUT_PATH), { recursive: true })
    await writeFile(OUTPUT_PATH, JSON.stringify(funders, null, 2), 'utf-8')
    console.log(`fetchFunders: wrote ${funders.length} funders to Funders.json`)
  } catch (err) {
    console.error('fetchFunders: could not write Funders.json:', err.message)
  }
}