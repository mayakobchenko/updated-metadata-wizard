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
//const ticketId = 36369676
//const ticketNumber = 4825517
//Ticket#4825517
//skjema id = 386195

const NETTSKJEMA_ELEMENTS_ID = {
    "ContactSurname": 5990407,
    "ContactFirstName" : 5990406,
    "ContactEmail": 5990408, 
    "IfContactCustodian": 5990410,
    "NameCustodian": 5990414,
    "SurnameCustodian": 5990415,
    "EmailCustodian": 5990416

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

        let contactFirstName     
        contactFirstName = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.ContactFirstName);
        if (!contactFirstName) {throw new Error("Could not find conact first name in nettskjema")}
        const contactFirst = contactFirstName['textAnswer']

        let contactSecondName     
        contactSecondName = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.ContactSurname)
        if (!contactSecondName) {throw new Error("Could not find conact second name in nettskjema")}
        const contactSurname = contactSecondName['textAnswer']

        let contactEmail     
        contactEmail = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.ContactEmail)
        if (!contactEmail) {throw new Error("Could not find conact email in nettskjema")}
        const contEmail = contactEmail['textAnswer']
        const contactInfo = [contactFirst, contactSurname, contEmail]

        let CustodianInfo 
        custodian = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.IfContactCustodian)
        if (custodian['answerOptionIds']===ANSWERS_ID.YesContactcustodian) {
            CustodianInfo = contactInfo} 
        else if (custodian['answerOptionIds']===ANSWERS_ID.NoContactCustodian) {
            const custodianName = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.NameCustodian)
            const custodianSurname = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.SurnameCustodian)
            const custodianEmail = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.EmailCustodian)
            CustodianInfo = [custodianName, custodianSurname, custodianEmail]}
        


        console.log( contactInfo )

        res.status(200).json({ message: `Nettskjema id: ${submissionId}`, nettskjemaInfo: contactInfo })
    } catch (error) {
        console.error('Error fetching info from zammad', error.message)
        res.status(500).send('Internal server error')}
}

export default router