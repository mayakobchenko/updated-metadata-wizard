import dotenv from 'dotenv'
import express from 'express'
dotenv.config()

const maya_token = process.env.MAYA_ZAMMAD_TOKEN
const nettskjemaClient = process.env.NETTSKJEMA_CLIENT_ID
const nettskjemaSecret = process.env.NETTSKJEMA_CLIENT_SECRET
const nettskjemaEndpoint = process.env.TOKEN_ENDPOINT_URL

const token_zammad= "Bearer " + maya_token
const myHeaders = new Headers()
myHeaders.append("Content-Type", "application/json")
myHeaders.append("Authorization", token_zammad)
myHeaders.append("Accept", '*/*')
const zammadHeaders = {headers: myHeaders}
const zammadBaseUrl = 'https://support.humanbrainproject.eu/'

const router = express.Router()
router.get('/zammadinfo', getZammadInfo)
router.get('/nettskjema', getNettskjemaInfo)

//https://api.nettskjema.no/v3/swagger-ui/index.html
//curation request nettskjema id=386195
//https://api.nettskjema.no/v3/form/386195/definition    -> elements  -> elementId
//https://api.nettskjema.no/v3/form/386195/elements
//https://support.humanbrainproject.eu/#ticket/zoom/{ticket_id} 
const searchTitle = 'EBRAINS Curation Request Accepted'
//skjema id = 386195
//https://127.0.0.1:8080/?TicketNumber=4825517
//submission-ID:37004993

const NETTSKJEMA_ELEMENTS_ID = {
    "ContactSurname": 5990407,
    "ContactFirstName" : 5990406,
    "ContactEmail": 5990408, 
    "IfContactCustodian": 5990410,
    "NameCustodian": 5990414,
    "SurnameCustodian": 5990415,
    "EmailCustodian": 5990416,
    "ORCIDcustodian": 5990417,
    "InstitutionCustodian":5990418,
    "CountryInstitution": 5990419,  //dropdown, answerOptionId, text: in https://nettskjema.no/api/v3/form/386195/elements
    "GroupLeader": 5990420,
    "ORCIDgroupLeader": 5990421,
    "BriefSummary": 6159880,   
    "SummaryNoveltiesNewVersion": 5990399,  //if new version of data
    "Title":  6159879,
    "UrlDoiRepo": 5990441,  //data published repo
    "DoiJournal": 5990439,   //article describing data
}

//answer option id
const ANSWERS_ID = {
    "YesContactcustodian": 14472467,
    "NoContactCustodian": 14472468
}
async function getZammadInfo (req, res) {
    try {
        let ticket
        if (req.query){ ticket = req.query }
        const ticketUrl = `${zammadBaseUrl}api/v1/tickets/search?query=${ticket.TicketNumber}`
        const response = await fetch(ticketUrl, zammadHeaders)
        if (!response.ok) {throw new Error('Error searching for the ticket: ' + response.status)} 
        const data = await response.json()
        //console.log('ticket id:', data.tickets)

        let ticket_id
        if (data.tickets.length > 1) {
            ticket_id = data.tickets[0]
        } else {ticket_id = data.tickets}
        const ticketInfo = data.assets.Ticket[ticket_id]
        const articleIds = ticketInfo["article_ids"]

        //console.log('article ids:', articleIds)

        let collabId
        if (articleIds) {
            const articleUrl = `${zammadBaseUrl}api/v1/ticket_articles/${articleIds[0]}`
            const resp_article = await fetch(articleUrl, zammadHeaders)
            if (!resp_article.ok) { throw new Error('Error searching for the collab info in zammad ticket: ' + resp_artcile.status) }
            const collabInfo = await resp_article.json()
            collabId = collabInfo["body"]

            //console.log('collab info:', collabId)
        }
        const regex_collab = /d-([0-9a-fA-F-]{36})/
        const match_collab = collabId.match(regex_collab)
        let datasetVersionId
        if (match_collab) {
            datasetVersionId = match_collab[1]

            console.log('collab id:', match_collab[1])
        }

        const dataTitle = ticketInfo.title
        const isTicket = dataTitle.includes(searchTitle)
        let refNumber = null
        let submissionId = 0
        const regex = /(?<=Ref\.?\s+)\d+/
        //const regex = /(?<=Ref\.?\s?)\d+/
        if (isTicket) {
            const match = dataTitle.match(regex)
            refNumber = match[0]
            submissionId = parseInt(refNumber, 10)
            console.log(`Submitted nettskjema id: ${refNumber}`)
        } else {console.log('No nettskjema id in the ticket')}  
        res.status(200).json({
            message: `Nettskjema id: ${submissionId}; 
            Dataset Version id: ${datasetVersionId}`,
            submissionId: submissionId,
            datasetVersionId: datasetVersionId
        })
    } catch (error) {
        console.error('Error fetching info from zammad', error.message)
        res.status(500).send('Internal server error')}
}

async function getNettskjemaInfo (req, res) {
    try {
        let info
        if (req.query){ info = req.query }
        const submissionId = info.NettskjemaId
        const nettskjemaAuth = Buffer.from(`${nettskjemaClient}:${nettskjemaSecret}`).toString('base64')
        const response = await fetch(nettskjemaEndpoint, {
            method: 'POST',
            headers: {'Authorization': `Basic ${nettskjemaAuth}`,
                      'Content-Type': 'application/x-www-form-urlencoded'},
            body: new URLSearchParams({'grant_type': 'client_credentials'}).toString()})
        if (!response.ok) {throw new Error('Error fetching nettskjema token: ' + response.status)}  
        const data = await response.json()
        const nettskjemaToken = data.access_token 
        //to use swagger:
        //console.log(nettskjemaToken)
        if (!nettskjemaToken) {throw new Error('Nettskjema token not received.')}
        const submissionResponse = await fetch(`https://nettskjema.no/api/v3/form/submission/${submissionId}`, {
            method: 'GET',
            headers: {'Authorization': `Bearer ${nettskjemaToken}`,
                      'Accept': 'application/json' }})
        const submissionData = await submissionResponse.json()
        const keys = Object.keys(submissionData)
        if (keys.length < 2) {
            console.log(`wrong submission id: ${submissionData.message}`)
            throw new Error(`wrong submission id: ${submissionData.message}`)}    
        if (!submissionData || !Array.isArray(submissionData['answers'])) {
            throw new Error("Invalid submission data or missing answers field") }

        const answers = submissionData['answers']

        const contactFirstName = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.ContactFirstName)?.textAnswer ?? null
        const contactSurname = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.ContactSurname)?.textAnswer ?? null
        const contactEmail = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.ContactEmail)?.textAnswer ?? null
        const ContactInfo = [contactFirstName, contactSurname, contactEmail]

        const custodianORCID = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.ORCIDcustodian)?.textAnswer ?? null
        const custodianInstitution = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.InstitutionCustodian)?.textAnswer ?? null
        
        //check if contact person is the data custodian
        let CustodianInfo 
        const ifcustodian = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.IfContactCustodian)?.answerOptionIds ?? null
        if (ifcustodian[0]===ANSWERS_ID.YesContactcustodian) { 
            CustodianInfo = ContactInfo   //if contact is custodian
            CustodianInfo = [...CustodianInfo, custodianORCID, custodianInstitution]
            //CustodianInfo = [ContactInfo, custodianORCID, custodianInstitution]
            } 
        else if (ifcustodian[0]===ANSWERS_ID.NoContactCustodian) {
            const custodianName = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.NameCustodian)?.textAnswer ?? null
            const custodianSurname = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.SurnameCustodian)?.textAnswer ?? null
            const custodianEmail = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.EmailCustodian)?.textAnswer ?? null
            CustodianInfo = [custodianName, custodianSurname, custodianEmail, custodianORCID, custodianInstitution]}
        
        const dataTitle = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.Title)?.textAnswer ?? null    
        const briefSummary = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.BriefSummary)?.textAnswer ?? null
        const DataInfo = [dataTitle, briefSummary]
        
        const GroupLeaderName = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.GroupLeader)?.textAnswer ?? null    
        const GroupLeaderOrcid = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.ORCIDgroupLeader)?.textAnswer ?? null
        const GroupLeader = [GroupLeaderName, GroupLeaderOrcid]

        const Data2UrlDoiRepo = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.UrlDoiRepo)?.textAnswer ?? null    
        const Data2DoiJournal = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.DoiJournal)?.textAnswer ?? null
        const Data2Info = [Data2UrlDoiRepo, Data2DoiJournal]
        //console.log('data2Info', Data2Info)

        res.status(200).json({ ContactInfo: ContactInfo,  CustodianInfo: CustodianInfo, GroupLeader: GroupLeader, DataInfo: DataInfo, Data2Info: Data2Info})
    } catch (error) {
        console.error('Error fetching info from zammad', error.message)
        res.status(500).send('Internal server error')}
}

export default router