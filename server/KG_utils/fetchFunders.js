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

  // ── 1. read Funding.json ──────────────────────────────────────────────────
  let funding = []
  try {
    const raw = await readFile(FUNDING_PATH, 'utf-8')
    funding   = JSON.parse(raw)
    console.log(`fetchFunders: loaded ${funding.length} funding entries`)
    // debug: show what funder field actually looks like
    console.log('fetchFunders: sample funder fields:',
      funding.slice(0, 3).map(f => f.funder)
    )
  } catch (err) {
    console.error('fetchFunders: could not read Funding.json:', err.message)
    return
  }

  // ── 2. collect unique funder @ids ─────────────────────────────────────────
  // funder field may be stored as {"@id": "..."} or as a plain string
  // handle both cases
  const extractFunderId = (f) => {
    const funder = f.funder
    if (!funder) return null
    if (typeof funder === 'string') return funder
    if (typeof funder === 'object') return funder['@id'] || null
    return null
  }

  const uniqueFunderIds = [...new Set(
    funding.map(extractFunderId).filter(Boolean)
  )]

  console.log(`fetchFunders: found ${uniqueFunderIds.length} unique funder IDs:`, uniqueFunderIds)

  if (uniqueFunderIds.length === 0) {
    console.warn('fetchFunders: no funder IDs found in Funding.json')
    return
  }

  // ── 3. fetch each funder from KG ─────────────────────────────────────────
  const requestOptions = await getRequestOptions()

  const results = await Promise.allSettled(
    uniqueFunderIds.map(async (funderUrl) => {
      const uuid   = funderUrl.split('/').pop()
      const apiUrl = `https://core.kg.ebrains.eu/v3/instances/${uuid}?stage=RELEASED`

      try {
        const resp = await fetch(apiUrl, requestOptions)

        if (!resp.ok) {
          console.warn(`fetchFunders: ${uuid} → HTTP ${resp.status}`)
          // still include in output with null name so we know it exists
          return { id: funderUrl, uuid, name: null }
        }

        const data = await resp.json()

        // log the full data object to debug name extraction
        console.log(`fetchFunders: raw data for ${uuid}:`,
          JSON.stringify(data.data).slice(0, 300)
        )

        // fullName is a plain string in this KG — not wrapped in an object
        const name =
          data.data?.['https://openminds.om-i.org/props/fullName']  ||
          data.data?.['https://openminds.ebrains.eu/vocab/fullName'] ||
          data.data?.['https://openminds.om-i.org/props/shortName']  ||
          null

        console.log(`fetchFunders: ${uuid} → name="${name}"`)
        return { id: funderUrl, uuid, name }

      } catch (err) {
        console.error(`fetchFunders: error fetching ${uuid}:`, err.message)
        return { id: funderUrl, uuid, name: null }
      }
    })
  )

  // ── 4. save ALL funders — including those with null name ─────────────────
  // Previously we filtered out null-name entries which caused missing funders.
  // Now we keep all of them and fall back to a shortened UUID for display.
  const funders = results
    .filter(r => r.status === 'fulfilled' && r.value)
    .map(r => ({
      id:   r.value.id,
      uuid: r.value.uuid,
      // if name is null, use a readable fallback instead of the full URL
      name: r.value.name || `Unknown funder (${r.value.uuid.slice(0, 8)}…)`,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  console.log(`fetchFunders: saving ${funders.length} funders:`,
    funders.map(f => `${f.uuid.slice(0,8)} → "${f.name}"`)
  )

  try {
    await mkdir(path.dirname(OUTPUT_PATH), { recursive: true })
    await writeFile(OUTPUT_PATH, JSON.stringify(funders, null, 2), 'utf-8')
    console.log(`fetchFunders: wrote ${funders.length} funders to Funders.json`)
  } catch (err) {
    console.error('fetchFunders: could not write Funders.json:', err.message)
  }
}