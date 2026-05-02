import express from 'express'
import {getRequestOptions} from '../KG_utils/kgAuthentication.js'
import path from 'path'
import { fileURLToPath } from 'url'
import { readFile } from 'fs/promises'
//https://core.kg.ebrains.eu/swagger-ui/index.html

const router = express.Router()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

router.get('/contributors', getContributors)
router.get('/consortium', getConsortium)
router.get('/contributorsfile', getContributorsfile)
router.get('/experimentalapproaches', getExperimentalApproaches)
router.get('/preparationtypes', getPreparationTypes)
router.get('/license', getLicense)
router.get('/typecontribution', getTypeContribution) 
router.get('/studytargets', getStudyTargets)
router.get('/datatypes', getSemanticDataTypes)
router.get('/techniques', getTechniques)

const OPENMINDS_VOCAB = "https://openminds.ebrains.eu/vocab"
const API_BASE_URL = "https://core.kg.ebrains.eu/"
const API_ENDPOINT = "v3/instances"
const QUERY_PARAMS = ["stage=RELEASED", "space=common", "type=https://openminds.ebrains.eu/core/"]

router.get('/funding', async (req, res) => {
  const fundingPath = path.join(__dirname, '../data/kg-instances/Funding.json')
  const fundersPath = path.join(__dirname, '../data/kg-instances/Funders.json')

  try {
    const [rawFunding, rawFunders] = await Promise.all([
      readFile(fundingPath, 'utf-8'),
      readFile(fundersPath, 'utf-8').catch(() => '[]'),
    ])

    const funding = JSON.parse(rawFunding)
    const funders = JSON.parse(rawFunders)

    // build lookup: funder @id → name
    const funderLookup = {}
    for (const f of funders) {
      if (f.id && f.name) funderLookup[f.id] = f.name
    }

    // attach funderName to each funding entry
    const enriched = funding.map(f => ({
      uuid:        f.uuid        || '',
      awardTitle:  f.awardTitle  || '',
      awardNumber: f.awardNumber || '',
      revision:    f.revision    || '',
      funder:      f.funder      || {},
      funderName:  funderLookup[f.funder?.['@id']] || f.funder?.['@id'] || 'Unknown funder',
    }))

    res.status(200).json({ funding: enriched })

  } catch (err) {
    console.error('Error in /funding route:', err.message)
    res.status(500).json({ funding: [] })
  }
})
/*
router.get('/organisations', async (req, res) => {
  const filePath = path.join(__dirname, '../data/kg-instances/Organization.json')
  try {
    const raw          = await readFile(filePath, 'utf-8')
    const data         = JSON.parse(raw)
    const organisations = Array.isArray(data) ? data : data.organisations || data.organization || []
    res.status(200).json({ organisations })
  } catch (err) {
    console.error('Error reading Organization.json:', err.message)
    res.status(500).json({ organisations: [] })
  }
})
*/

async function getTechniques(req, res) {
  const filePath = path.join(__dirname, '../data/techniques/techniques.json')
  try {
    const data = await readFile(filePath, 'utf-8')
    res.status(200).json({ techniques: JSON.parse(data) })
  } catch (err) {
    console.error('Error reading techniques.json:', err.message)
    res.status(500).send('Error fetching techniques')
  }
}

//this route can be used for direct fetching from KG, not used at the moment
async function getContributors(req, res) {
    const TYPE_NAME = "Person"
    const queryUrl = `${API_BASE_URL}${API_ENDPOINT}?${QUERY_PARAMS.join("&")}${TYPE_NAME}`
    const properties = ["familyName", "givenName", "digitalIdentifier"]
    //console.log('get contributors function is running')
    try {
        let personKG =[]
        const requestOptions = await getRequestOptions()
        const response = await fetch(queryUrl, requestOptions)
        if (response.status === 200) {
            const data = await response.json()
            let typeInstanceList = []
            for (let thisInstance of data.data) {
                let newInstance = { "identifier": thisInstance["@id"] }
                let isEmpty = true
                for (let propertyName of properties) {
                    const vocabName = `${OPENMINDS_VOCAB}/${propertyName}`
                    if (thisInstance[vocabName] !== undefined) {
                      isEmpty = false
                      if (propertyName == "digitalIdentifier") {
                        newInstance["orcid_uuid"] = thisInstance[vocabName]["@id"]
                      } else {newInstance[propertyName] = thisInstance[vocabName]}}}
                if (!isEmpty) {
                    typeInstanceList.push(newInstance)}
            }
            personKG.push(typeInstanceList)
        } else { throw new Error('Error fetching contributors. Status code: ' + response.status)}
      console.log(personKG)
      res.json({personKG})
    } catch (error) {
      console.error('Error fetching contributors from backend', error.message)
      res.status(500).send('Error fetching contributors from backend')
    }
  }

async function getTypeContribution(req, res) { 
    const filePath = path.join(__dirname, '../data/controlledTerms/ContributionType.json')
    try {
        let typecontribution
        try {
            const data = await readFile(filePath, 'utf-8')
            typecontribution = JSON.parse(data)
        } catch (err) {
            typecontribution = []} 
        res.status(200).json({ typecontribution })
    } catch (error) {
        console.error('Error fetching contribution types from backend', error.message)
        res.status(500).send('Error fetching contribution types from backend')}
}
async function getConsortium(req, res) {
    //const TYPE_NAME = "consortium"
    //const queryUrl = `${API_BASE_URL}${API_ENDPOINT}?${QUERY_PARAMS.join("&")}${TYPE_NAME}`
    //const properties = ["identifier", "fullName"]
    const filePath = path.join(__dirname, '../data/kg-instances/Consortium.json')
    try {
        let consortium
        try {
            const data = await readFile(filePath, 'utf-8')
            consortium = JSON.parse(data)
        } catch (err) {
            consortium = []} 
        res.status(200).json({ consortium })
    } catch (error) {
        console.error('Error fetching consortium from backend', error.message)
        res.status(500).send('Error fetching consortium from backend')}
}  

async function getContributorsfile(req, res) {
    const filePath = path.join(__dirname, '../data/kg-instances/Person.json')
    try {
        let person
        try {
          const data = await readFile(filePath, 'utf-8')
          person = JSON.parse(data)
        } catch (err) {
          person = []} 
      res.status(200).json({ person })
    } catch (error) {
      console.error('Error fetching contributors from backend', error.message)
      res.status(500).send('Error fetching contributors from backend')}
  }  

async function getExperimentalApproaches(req, res) {
  const filePath = path.join(__dirname, '../data/controlledTerms/ExperimentalApproach.json')
  try {
      let expApproach
      try {
        const data = await readFile(filePath, 'utf-8')
        expApproach = JSON.parse(data)
      } catch (err) {
        expApproach = []} 
    res.status(200).json({ expApproach })
  } catch (error) {
    console.error('Error fetching experimental approaches from backend', error.message)
    res.status(500).send('Error fetching experimental approaches from backend')}
}

async function getPreparationTypes(req, res) {
  const filePath = path.join(__dirname, '../data/controlledTerms/PreparationType.json')
  try {
      let prepType
      try {
        const data = await readFile(filePath, 'utf-8')
        prepType = JSON.parse(data)
      } catch (err) {
        prepType = []} 
    res.status(200).json({ prepType })
  } catch (error) {
    console.error('Error fetching preparation types', error.message)
    res.status(500).send('Error fetching preparation types from backend')}
}  
/*
async function getTechniques(req, res) {
  const filePath = path.join(__dirname, '../data/controlledTerms/Technique.json')
  try {
      let techniques
      try {
        const data = await readFile(filePath, 'utf-8')
        techniques = JSON.parse(data)
      } catch (err) {
        techniques = []} 
    res.status(200).json({ techniques })
  } catch (error) {
    console.error('Error fetching techniques', error.message)
    res.status(500).send('Error fetching techniques from backend')}
}*/

async function getLicense (req, res) {
  const filePath = path.join(__dirname, '../data/kg-instances/Licenses.json')
  try {
    let license
    try {
      const data = await readFile(filePath, 'utf-8')
      license = JSON.parse(data)} catch (err) {license = []} 
    res.status(200).json({ license })
    } catch (error) {
      console.error('Error fetching license file from the backend', error.message)
      res.status(500).send('Error fetching license file from the backend')}
}
 
async function getStudyTargets(req, res) {
  const filePath = path.join(__dirname, '../data/studyTargets/studyTargets.json')
  try {
      let studyTargets
      try {
        const data = await readFile(filePath, 'utf-8')
        studyTargets = JSON.parse(data)
      } catch (err) {
        studyTargets = []} 
    res.status(200).json({ studyTargets })
  } catch (error) {
    console.error('Error reading studyTargets.json:', error.message)
    res.status(500).send('Failed to load study targets')}
}  

async function getSemanticDataTypes (req, res) {
  const filePath = path.join(__dirname, '../data/controlledTerms/SemanticDataType.json')
  try {
    let dataTypes
    try {
      const data = await readFile(filePath, 'utf-8')
      dataTypes = JSON.parse(data)} catch (err) {dataTypes = []} 
    res.status(200).json({ dataTypes })
    } catch (error) {
      console.error('Error fetching semantic data types from the backend', error.message)
      res.status(500).send('Error fetching semantic data types from the backend')}
}

export default router