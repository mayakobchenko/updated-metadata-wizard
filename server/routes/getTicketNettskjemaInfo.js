import dotenv        from 'dotenv'
import express       from 'express'
import { readFile }  from 'fs/promises'
import logger        from '../logger.js'

dotenv.config()

// ── constants ─────────────────────────────────────────────────────────────────

const ZAMMAD_TOKEN       = process.env.MAYA_ZAMMAD_TOKEN
const NETTSKJEMA_CLIENT  = process.env.NETTSKJEMA_CLIENT_ID
const NETTSKJEMA_SECRET  = process.env.NETTSKJEMA_CLIENT_SECRET
const NETTSKJEMA_ENDPOINT = process.env.TOKEN_ENDPOINT_URL

const ZAMMAD_BASE        = 'https://support.humanbrainproject.eu'
const ZAMMAD_HEADERS     = {
  headers: new Headers({
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${ZAMMAD_TOKEN}`,
    'Accept':        '*/*'
  })
}

const router = express.Router()

// ── routes ────────────────────────────────────────────────────────────────────

router.get('/zammadinfo',   getZammadInfo)
router.get('/nettskjema',   getNettskjemaInfo)
router.post('/save-json',   saveJsonToTicket)

// ── Nettskjema element IDs ────────────────────────────────────────────────────

const NETTSKJEMA_ELEMENTS_ID = {
  EmailPersonNettskjema:    5990394,
  RequestType:              5990395,
  AlreadyContactCuration:   5990396,
  DatasetUpdate:            5990398,
  Novelties:                5990399,
  Spicies:                  6409074,
  DataTypes:                5990401,   //raw, simulation etc What type of data do you wish to share?
  ContactSurname:           5990407,
  ContactFirstName:         5990406,
  ContactEmail:             5990408,
  IfContactCustodian:       5990410,
  NameCustodian:            5990414,
  SurnameCustodian:         5990415,
  EmailCustodian:           5990416,
  ORCIDcustodian:           5990417,
  InstitutionCustodian:     5990418,
  CountryInstitution:       5990419,
  GroupLeader:              5990420,
  ORCIDgroupLeader:         5990421,
  BriefSummary:             6159880,
  SummaryNoveltiesNewVersion: 5990399,
  Title:                    6159879,
  Embargo:                  5990445,
  DescribedArticle:         5990438,
  DoiJournal:               5990439,
  DataRepo:                 5990440,
  UrlDoiRepo:               5990441,
  WillPiblish:              5990442,
  WillSubmitJournal:        5990443,
  ChoseEmbargo: 5990444,
  DataStandart: 5990460,  //Did you use one or several (meta)data/repository standards?
  OtherDataType: 5990403,  //Please specify which other type of data you want to share
  OtherDataStandart: 5990461,  //Please specify which other standard was used
}

// ── Nettskjema answer option IDs ──────────────────────────────────────────────

const ANSWERS_ID = {
  YesContactcustodian:   14472467,
  NoContactCustodian:    14472468,
  YesEmbargo:            14472756,
  NoEmbargo:             14472757,
  NewDataset:            14472450,
  NewVersionOfExisting:  14472451,
  InContactCuration:     14472452,
  FirstTime:             14472453,
  HomoSapiens:           15328168,
  Macaca:                15328169,
  Mus:                   15328170,
  Ratus:                 15328171,
  OtherSpicies:          15328172,
  YesArticle:            14472746,
  NoArticle:             14472747,
  DataPublishedYes:      14472748,
  PartofDataPublished:   14472749,
  DataNotPublished:      14472750,
  ExperimentalData:      14472456,   //What type of data do you wish to share?
  SimulationData:        14472457,   //What type of data do you wish to share?
  ComputationalModel:    14472458,   //What type of data do you wish to share?
  Software:              14472459,   //What type of data do you wish to share?
  BrainAtlas:            14472460,   //What type of data do you wish to share?
  OtherData:             14472461,   //What type of data do you wish to share?
  WillSumbit:            14472751,
  WillNot:               14472752,
  FreeAccess:            15156763,
  RequestEmbargo:        15156764,
  KeepPrivate: 15156765,
  NoStandart: 14473022,              //Did you use one or several (meta)data/repository standards?
  NIX: 14473023,
  NWB: 14473024,
  Sonata: 14473025,
  Bids: 14473026, 
  NeuroML: 14473027,
  odML: 14473028,
  openMinds: 14745188,
  other: 14473029,
}

// ── GET /api/zammad/zammadinfo ────────────────────────────────────────────────
// Looks up a Zammad ticket by ticket number and extracts the dataset version ID
// and nettskjema submission ID from the ticket title and first article body.

async function getZammadInfo(req, res) {
  try {
    const ticketNumber = req.query.TicketNumber
    if (!ticketNumber) {
      return res.status(400).json({ error: 'TicketNumber query param is required' })
    }

    logger.info(`Fetching Zammad info for ticket: ${ticketNumber}`)

    // ── search for ticket by number ───────────────────────────────────────────
    const searchUrl  = `${ZAMMAD_BASE}/api/v1/tickets/search?query=${ticketNumber}`
    const searchResp = await fetch(searchUrl, ZAMMAD_HEADERS)
    if (!searchResp.ok) {
      throw new Error(`Error searching for ticket: ${searchResp.status}`)
    }
    const searchData = await searchResp.json()

    const ticketId   = Array.isArray(searchData.tickets) && searchData.tickets.length > 1
      ? searchData.tickets[0]
      : searchData.tickets

    const ticketInfo = searchData.assets?.Ticket?.[ticketId]
    if (!ticketInfo) {
      throw new Error(`Ticket ${ticketNumber} not found in Zammad`)
    }

    const articleIds = ticketInfo.article_ids || []

    // ── extract collab/dataset version ID from first article body ─────────────
    let collabId         = null
    let datasetVersionId = null

    if (articleIds.length > 0) {
      const articleUrl  = `${ZAMMAD_BASE}/api/v1/ticket_articles/${articleIds[0]}`
      const articleResp = await fetch(articleUrl, ZAMMAD_HEADERS)
      if (!articleResp.ok) {
        throw new Error(`Error fetching article: ${articleResp.status}`)
      }
      const articleData = await articleResp.json()
      collabId          = articleData.body

      const matchCollab = collabId?.match(/d-([0-9a-fA-F-]{36})/)
      if (matchCollab) {
        datasetVersionId = matchCollab[1]
        logger.info(`Extracted datasetVersionId: ${datasetVersionId}`)
      }
    }

    // ── extract nettskjema submission ID from ticket title ────────────────────
    const dataTitle   = ticketInfo.title || ''
    const SEARCH_TITLE = 'EBRAINS Curation Request Accepted'
    const isTicket    = dataTitle.includes(SEARCH_TITLE)

    let submissionId  = 0
    if (isTicket) {
      const match = dataTitle.match(/(?<=Ref\.?\s+)\d+/)
      if (match) {
        submissionId = parseInt(match[0], 10)
        logger.info(`Nettskjema submission ID: ${submissionId}`)
      }
    } else {
      logger.info(`No nettskjema ID found in ticket title: "${dataTitle}"`)
    }

    return res.status(200).json({
      message:         `Nettskjema id: ${submissionId}; Dataset Version id: ${datasetVersionId}`,
      submissionId:    submissionId,
      datasetVersionId: datasetVersionId,
      ticketId:        ticketId,          // ← internal Zammad ticket ID (integer)
      ticketNumber:    ticketNumber,      // ← the human-readable ticket number
    })

  } catch (error) {
    logger.error(`Error fetching Zammad info: ${error.message}`)
    return res.status(500).json({ error: error.message })
  }
}

// ── GET /api/zammad/nettskjema ────────────────────────────────────────────────
// Fetches a Nettskjema submission and extracts all relevant metadata fields.

async function getNettskjemaInfo(req, res) {
  try {
    const submissionId = req.query.NettskjemaId
    if (!submissionId) {
      return res.status(400).json({ error: 'NettskjemaId query param is required' })
    }

    // ── get Nettskjema OAuth token ────────────────────────────────────────────
    const nettskjemaAuth = Buffer.from(`${NETTSKJEMA_CLIENT}:${NETTSKJEMA_SECRET}`).toString('base64')
    const tokenResp      = await fetch(NETTSKJEMA_ENDPOINT, {
      method:  'POST',
      headers: {
        'Authorization': `Basic ${nettskjemaAuth}`,
        'Content-Type':  'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ grant_type: 'client_credentials' }).toString()
    })
    if (!tokenResp.ok) {
      throw new Error(`Error fetching Nettskjema token: ${tokenResp.status}`)
    }
    const tokenData      = await tokenResp.json()
    const nettskjemaToken = tokenData.access_token
    if (!nettskjemaToken) {
      throw new Error('Nettskjema token not received.')
    }

    // ── fetch submission ──────────────────────────────────────────────────────
    const submissionResp = await fetch(
      `https://nettskjema.no/api/v3/form/submission/${submissionId}`,
      {
        method:  'GET',
        headers: {
          'Authorization': `Bearer ${nettskjemaToken}`,
          'Accept':        'application/json'
        }
      }
    )
    const submissionData = await submissionResp.json()

    if (Object.keys(submissionData).length < 2) {
      throw new Error(`Wrong submission ID: ${submissionData.message}`)
    }
    if (!Array.isArray(submissionData.answers)) {
      throw new Error('Invalid submission data or missing answers field')
    }

    const answers = submissionData.answers
    const find    = (elementId) => answers.find(a => a.elementId === elementId)

    // ── contact person ────────────────────────────────────────────────────────
    const contactFirstName = find(NETTSKJEMA_ELEMENTS_ID.ContactFirstName)?.textAnswer ?? null
    const contactSurname   = find(NETTSKJEMA_ELEMENTS_ID.ContactSurname)?.textAnswer   ?? null
    const contactEmail     = find(NETTSKJEMA_ELEMENTS_ID.ContactEmail)?.textAnswer     ?? null
    const ContactInfo      = [contactFirstName, contactSurname, contactEmail]

    const custodianORCID       = find(NETTSKJEMA_ELEMENTS_ID.ORCIDcustodian)?.textAnswer       ?? null
    const custodianInstitution = find(NETTSKJEMA_ELEMENTS_ID.InstitutionCustodian)?.textAnswer ?? null

    // ── custodian ─────────────────────────────────────────────────────────────
    let CustodianInfo
    const ifCustodian = find(NETTSKJEMA_ELEMENTS_ID.IfContactCustodian)?.answerOptionIds ?? null

    if (ifCustodian?.[0] === ANSWERS_ID.YesContactcustodian) {
      CustodianInfo = [...ContactInfo, custodianORCID, custodianInstitution]
    } else if (ifCustodian?.[0] === ANSWERS_ID.NoContactCustodian) {
      const custodianName    = find(NETTSKJEMA_ELEMENTS_ID.NameCustodian)?.textAnswer    ?? null
      const custodianSurname = find(NETTSKJEMA_ELEMENTS_ID.SurnameCustodian)?.textAnswer ?? null
      const custodianEmail   = find(NETTSKJEMA_ELEMENTS_ID.EmailCustodian)?.textAnswer   ?? null
      CustodianInfo = [custodianName, custodianSurname, custodianEmail, custodianORCID, custodianInstitution]
    }

    // ── dataset info ──────────────────────────────────────────────────────────
    const dataTitle    = find(NETTSKJEMA_ELEMENTS_ID.Title)?.textAnswer        ?? null
    const briefSummary = find(NETTSKJEMA_ELEMENTS_ID.BriefSummary)?.textAnswer ?? null

    let isRequestingNew
    const ifNewDataset = find(NETTSKJEMA_ELEMENTS_ID.RequestType)?.answerOptionIds ?? null
    if (ifNewDataset?.[0] === ANSWERS_ID.NewDataset)           isRequestingNew = true
    if (ifNewDataset?.[0] === ANSWERS_ID.NewVersionOfExisting) isRequestingNew = false
/*
    let optionsData
    const selectedDataTypes = find(NETTSKJEMA_ELEMENTS_ID.DataTypes)?.answerOptionIds ?? null
    if (selectedDataTypes?.[0] === ANSWERS_ID.ExperimentalData) optionsData = 'Experimental data'
    if (selectedDataTypes?.[0] === ANSWERS_ID.SimulationData)   optionsData = [...(optionsData ? [optionsData] : []), 'Simulated data']
*/  
    const selectedDataTypes = find(NETTSKJEMA_ELEMENTS_ID.DataTypes)?.answerOptionIds ?? []
    const DATA_TYPE_MAP = {
      [ANSWERS_ID.ExperimentalData]:   'Experimental data',  
      [ANSWERS_ID.SimulationData]:     'Simulated data'}
    const optionsData = selectedDataTypes.length > 0
      ? selectedDataTypes.map(id => DATA_TYPE_MAP[id]).filter(Boolean) : null
    
    const otherDataType = find(NETTSKJEMA_ELEMENTS_ID.OtherDataType)?.textAnswer ?? null

    // ── data types (multi-select checkbox) ───────────────────────────────────────
    /*
    const selectedDataTypes = find(NETTSKJEMA_ELEMENTS_ID.DataTypes)?.answerOptionIds ?? []
    const DATA_TYPE_MAP = {
      [ANSWERS_ID.ExperimentalData]:   'experimental data (raw/derived)',  
      [ANSWERS_ID.SimulationData]:     'simulated data',
      [ANSWERS_ID.ComputationalModel]: 'a computational model',
      [ANSWERS_ID.Software]:           'software',
      [ANSWERS_ID.BrainAtlas]:         'brain atlas',
      [ANSWERS_ID.OtherData]:          'other(s)',}
    const optionsData = selectedDataTypes.length > 0
      ? selectedDataTypes.map(id => DATA_TYPE_MAP[id]).filter(Boolean) : null
    const otherDataType = find(NETTSKJEMA_ELEMENTS_ID.OtherDataType)?.textAnswer ?? null
    */
    // ── data standards (multi-select checkbox) ───────────────────────────────────
    const selectedDataStandarts = find(NETTSKJEMA_ELEMENTS_ID.DataStandart)?.answerOptionIds ?? []

    const DATA_STANDARD_MAP = {
      [ANSWERS_ID.NoStandart]: 'No, I didn\'t use a standard',
      [ANSWERS_ID.NIX]:        'NIX',
      [ANSWERS_ID.NWB]:        'NWB',
      [ANSWERS_ID.Sonata]:     'SONATA',
      [ANSWERS_ID.Bids]:       'BIDS',
      [ANSWERS_ID.NeuroML]:    'neuroML',
      [ANSWERS_ID.odML]:       'odML',
      [ANSWERS_ID.openMinds]:  'openMINDS',
      [ANSWERS_ID.other]:      'other(s)',
    }

    const dataStandart = selectedDataStandarts.length > 0 ? selectedDataStandarts.map(id => DATA_STANDARD_MAP[id]).filter(Boolean) : null
    const otherDataStandart = find(NETTSKJEMA_ELEMENTS_ID.OtherDataStandart)?.textAnswer?? null
    // ── embargo ───────────────────────────────────────────────────────────────
    let embargo, embargoReview
    const isEmbargo    = find(NETTSKJEMA_ELEMENTS_ID.Embargo)?.answerOptionIds    ?? null
    const isSubmission = find(NETTSKJEMA_ELEMENTS_ID.ChoseEmbargo)?.answerOptionIds ?? null

    if (isEmbargo?.[0] === ANSWERS_ID.YesEmbargo) embargo = true

    if (isSubmission !== null) {
      if (isSubmission[0] === ANSWERS_ID.RequestEmbargo) embargo = true
      if (isSubmission[0] === ANSWERS_ID.KeepPrivate)  { embargo = true; embargoReview = true }
    }

    // ── will publish ──────────────────────────────────────────────────────────
    let willPublish, submitJournalName
    const isWillPublish = find(NETTSKJEMA_ELEMENTS_ID.WillPiblish)?.answerOptionIds ?? null
    if (isWillPublish !== null) {
      willPublish = isWillPublish[0] === ANSWERS_ID.WillSumbit
      if (willPublish) {
        submitJournalName = find(NETTSKJEMA_ELEMENTS_ID.WillSubmitJournal)?.textAnswer ?? null
      }
    }

    //const DataInfo = [dataTitle, briefSummary, embargo, optionsData, embargoReview, submitJournalName]
    const DataInfo = [dataTitle, briefSummary, embargo, optionsData, otherDataType,
      dataStandart, otherDataStandart, embargoReview, submitJournalName]
    // ── group leader ──────────────────────────────────────────────────────────
    const GroupLeaderName  = find(NETTSKJEMA_ELEMENTS_ID.GroupLeader)?.textAnswer     ?? null
    const GroupLeaderOrcid = find(NETTSKJEMA_ELEMENTS_ID.ORCIDgroupLeader)?.textAnswer ?? null
    const GroupLeader      = [GroupLeaderName, GroupLeaderOrcid]

    // ── data URLs ─────────────────────────────────────────────────────────────
    const Data2UrlDoiRepo = find(NETTSKJEMA_ELEMENTS_ID.UrlDoiRepo)?.textAnswer  ?? null
    const Data2DoiJournal = find(NETTSKJEMA_ELEMENTS_ID.DoiJournal)?.textAnswer  ?? null
    const Data2Info       = [Data2UrlDoiRepo, Data2DoiJournal]

    return res.status(200).json({
      ContactInfo,
      CustodianInfo,
      GroupLeader,
      DataInfo,
      Data2Info,
    })

  } catch (error) {
    logger.error(`Error fetching Nettskjema info: ${error.message}`)
    return res.status(500).json({ error: error.message })
  }
}

// ── POST /api/zammad/save-json ────────────────────────────────────────────────
// Saves the form JSON as an internal note attachment on a Zammad ticket.
// Body: { ticketId: number|string, jsonFilePath: string, datasetTitle?: string }
// No email is sent — article type is 'note' and internal: true.

async function saveJsonToTicket(req, res) {
  const { ticketId, jsonFilePath, datasetTitle } = req.body

  if (!ticketId) {
    return res.status(400).json({ error: 'ticketId is required' })
  }
  if (!jsonFilePath) {
    return res.status(400).json({ error: 'jsonFilePath is required' })
  }
  if (!ZAMMAD_TOKEN) {
    logger.error('MAYA_ZAMMAD_TOKEN is not set in environment')
    return res.status(500).json({ error: 'Zammad token not configured on server' })
  }

  try {
    // read the JSON file written by the KG upload flow
    const jsonContent = await readFile(jsonFilePath, 'utf-8')
    const base64Data  = Buffer.from(jsonContent, 'utf-8').toString('base64')
    const title       = datasetTitle || 'dataset'
    const filename    = `metadata_${title.replace(/[^a-z0-9_-]/gi, '_')}_${Date.now()}.json`

    const article = {
      ticket_id:    parseInt(ticketId, 10),
      subject:      `Metadata JSON — ${title}`,
      body:         `Metadata JSON file attached for dataset: ${title}.\nUploaded at: ${new Date().toISOString()}`,
      content_type: 'text/plain',
      type:         'note',      // internal note — no email is triggered
      internal:     true,
      sender:       'Agent',
      time_unit:    '0',
      attachments: [
        {
          filename:    filename,
          data:        base64Data,
          'mime-type': 'application/json'
        }
      ]
    }

    const response = await fetch(`${ZAMMAD_BASE}/api/v1/ticket_articles`, {
      method:  'POST',
      body:    JSON.stringify(article),
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${ZAMMAD_TOKEN}`
      }
    })

    const responseData = await response.json()

    if (response.ok) {
      logger.info(`Metadata JSON saved to Zammad ticket ${ticketId}, article id: ${responseData.id}`)
      return res.status(200).json({
        success:   true,
        articleId: responseData.id,
        ticketId,
        filename,
      })
    } else {
      logger.error(`Zammad error ${response.status}: ${JSON.stringify(responseData)}`)
      return res.status(response.status).json({
        error:  'Zammad API error',
        detail: responseData
      })
    }

  } catch (err) {
    logger.error(`Error saving JSON to Zammad: ${err.message}`)
    return res.status(500).json({ error: err.message })
  }
}

export default router