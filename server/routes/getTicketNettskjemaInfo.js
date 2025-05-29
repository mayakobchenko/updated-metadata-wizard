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
//https://support.humanbrainproject.eu/#ticket/zoom/{ticket_id} 
const searchTitle = 'EBRAINS Curation Request Accepted'
//skjema id = 386195
//https://127.0.0.1:8080/?TicketNumber=4825517

const NETTSKJEMA_ELEMENTS_ID = {
    "ContactSurname": 5990407,
    "ContactFirstName" : 5990406,
    "ContactEmail": 5990408, 
    "IfContactCustodian": 5990410,
    "NameCustodian": 5990414,
    "SurnameCustodian": 5990415,
    "EmailCustodian": 5990416,
    "ORCIDcustodian": 5990417,
    "ORCIDgroupLeader": 5990421,
    "BriefSummary": 6159880,   //options
    "Title":  6159879 

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
        const articleUrl = `${zammadBaseUrl}api/v1/tickets/search?query=${ticket.TicketNumber}`
        const response = await fetch(articleUrl, zammadHeaders)
        if (!response.ok) {throw new Error('Error searching for the ticket: ' + response.status);} 
        const data = await response.json()
        console.log('ticket id:', data.tickets)
        const ticketInfo = data.assets.Ticket[data.tickets];
        //console.log(`fetched ticket id: ${ticketInfo}`)
        //console.log(`fetched ticket number from zammad: ${ticketInfo.title}`)
        const dataTitle = ticketInfo.title;
        const isTicket = dataTitle.includes(searchTitle);
        let refNumber = null;
        let submissionId = 0;
        const regex = /(?<=Ref\.?\s?)\d+/
        if (isTicket) {
            const match = dataTitle.match(regex)
            refNumber = match[0]
            submissionId = parseInt(refNumber, 10)
            console.log(`Submitted nettskjema id: ${refNumber}`)
        } else {console.log('No nettskjema id in the ticket')}  
        res.status(200).json({ message: `Nettskjema id: ${submissionId}`, submissionId: submissionId })
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
        const submissionResponse = await fetch(`https://api.nettskjema.no/v3/form/submission/${submissionId}`, {
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
        //check if contact person is the data custodian
        let CustodianInfo 
        const ifcustodian = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.IfContactCustodian)?.answerOptionIds ?? null
        if (ifcustodian[0]===ANSWERS_ID.YesContactcustodian) { 
            CustodianInfo = ContactInfo
            CustodianInfo = [...CustodianInfo, custodianORCID]} 
        else if (ifcustodian[0]===ANSWERS_ID.NoContactCustodian) {
            const custodianName = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.NameCustodian)?.textAnswer ?? null
            const custodianSurname = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.SurnameCustodian)?.textAnswer ?? null
            const custodianEmail = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.EmailCustodian)?.textAnswer ?? null
            CustodianInfo = [custodianName, custodianSurname, custodianEmail, custodianORCID]}
        
        const dataTitle = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.Title)?.textAnswer ?? null    
        const briefSummary = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.BriefSummary)?.textAnswer ?? null
        const DataInfo = [dataTitle, briefSummary]
        //console.log(CustodianInfo)

        res.status(200).json({ ContactInfo: ContactInfo,  CustodianInfo: CustodianInfo, DataInfo: DataInfo})
    } catch (error) {
        console.error('Error fetching info from zammad', error.message)
        res.status(500).send('Internal server error')}
}

export default router