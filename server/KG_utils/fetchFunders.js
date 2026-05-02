import { readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename      = fileURLToPath(import.meta.url)
const __dirname       = path.dirname(__filename)
const FUNDING_PATH    = path.join(__dirname, 'data/kg-instances/Funding.json')
const ORG_PATH        = path.join(__dirname, 'data/kg-instances/Organization.json')
const CONSORTIUM_PATH = path.join(__dirname, 'data/kg-instances/Consortium.json')
const OUTPUT_PATH     = path.join(__dirname, 'data/kg-instances/Funders.json')

export default async function fetchFunders() {
  console.log('fetchFunders: starting…')

  // ── 1. read Funding.json ──────────────────────────────────────────────────
  let funding = []
  try {
    const raw = await readFile(FUNDING_PATH, 'utf-8')
    funding   = JSON.parse(raw)
    console.log(`fetchFunders: loaded ${funding.length} funding entries`)
  } catch (err) {
    console.error('fetchFunders: could not read Funding.json:', err.message)
    return
  }

  // ── 2. read Organization.json and Consortium.json ─────────────────────────
  // These are already written by fetchCoreSchemaInstances — no KG call needed.
  let orgs = []
  try {
    const raw = await readFile(ORG_PATH, 'utf-8')
    orgs      = JSON.parse(raw)
    console.log(`fetchFunders: loaded ${orgs.length} organisations`)
  } catch (err) {
    console.warn('fetchFunders: could not read Organization.json:', err.message)
  }

  let consortia = []
  try {
    const raw = await readFile(CONSORTIUM_PATH, 'utf-8')
    consortia  = JSON.parse(raw)
    console.log(`fetchFunders: loaded ${consortia.length} consortia`)
  } catch (err) {
    console.warn('fetchFunders: could not read Consortium.json:', err.message)
  }

  // ── 3. build lookup: full URL → name ─────────────────────────────────────
  // uuid in Organization.json is the full URL:
  // "https://kg.ebrains.eu/api/instances/524884fe-..."
  const nameLookup = new Map()

  for (const entry of [...orgs, ...consortia]) {
    const id   = entry.uuid     || ''
    const name = entry.fullName || entry.name || ''
    if (id && name) {
      nameLookup.set(id, name)
      console.log(`fetchFunders: lookup ${id.split('/').pop()} → "${name}"`)
    }
  }

  console.log(`fetchFunders: lookup has ${nameLookup.size} entries`)

  // ── 4. collect unique funder @ids from Funding.json ───────────────────────
  const uniqueFunderIds = [...new Set(
    funding
      .map(f => f.funder?.['@id'])
      .filter(Boolean)
  )]

  console.log(`fetchFunders: ${uniqueFunderIds.length} unique funder IDs:`, uniqueFunderIds)

  // ── 5. resolve name for each funder ──────────────────────────────────────
  const funders = uniqueFunderIds
    .map(funderUrl => {
      const name = nameLookup.get(funderUrl) || null
      const uuid = funderUrl.split('/').pop()
      if (!name) {
        console.warn(`fetchFunders: no name found for ${uuid} — not in Organization.json or Consortium.json`)
      }
      return {
        id:   funderUrl,
        uuid,
        name: name || `Unknown funder (${uuid.slice(0, 8)}…)`,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  console.log('fetchFunders: resolved:',
    funders.map(f => `${f.uuid.slice(0, 8)} → "${f.name}"`)
  )

  // ── 6. write Funders.json ─────────────────────────────────────────────────
  try {
    await mkdir(path.dirname(OUTPUT_PATH), { recursive: true })
    await writeFile(OUTPUT_PATH, JSON.stringify(funders, null, 2), 'utf-8')
    console.log(`fetchFunders: wrote ${funders.length} funders to Funders.json`)
  } catch (err) {
    console.error('fetchFunders: could not write Funders.json:', err.message)
  }
}