import dotenv from 'dotenv'
import express from 'express'
dotenv.config()

const maya_token = process.env.MAYA_ZAMMAD_TOKEN
const token_maya = "Bearer " + maya_token
const myHeaders = new Headers()
myHeaders.append("Content-Type", "application/json")
myHeaders.append("Authorization", token_maya)
myHeaders.append("Accept", '*/*')
const mayaHeaders = {headers: myHeaders}
const zammadBaseUrl = 'https://support.humanbrainproject.eu/'

const router = express.Router()
router.get('/zammadinfo', getZammadInfo)
//https://support.humanbrainproject.eu/#ticket/zoom/{ticket_id} 
const searchTitle = 'EBRAINS Curation Request Accepted'
//const ticketId = 36369676
//const ticketNumber = 4825517
//Ticket#4825517
//skjema id = 386195
//GET-Request sent: /api/v1/tickets/search?query=welcome

async function getZammadInfo (req, res) {
    try {
        let ticket
        if (req.query){
            ticket = req.query
            console.log('query:', ticket)
        }
        //const articleUrl = `${zammadBaseUrl}/api/v1/tickets/${ticketId}`;
        const articleUrl = `${zammadBaseUrl}/api/v1/tickets/search?query=${ticket}`
        const response = await fetch(articleUrl, mayaHeaders); 
        const data = await response.json();
        const dataTitle = data.title;
        console.log(`Submitted ticket title in zammad: ${dataTitle}`)
        console.log(`fetched ticket number from zammad: ${data.number}`)
 
        const isTicket = dataTitle.includes(searchTitle);
        let refNumber = null;
        let submissionId = 0;
        const regex = /(?<=Ref\.?\s?)\d+/
        //const regex = /\(Ref\.?\s*(\d+)\)/;
        if (isTicket) {
            const match = dataTitle.match(regex)
            refNumber = match[0]
            submissionId = parseInt(refNumber, 10)
            //refNumber = match[1];
            console.log(`Submitted nettskjema id: ${refNumber}`)
        } else {
            console.log('No nettskjema id in the ticket')}  

        res.status(200).json({ message: `Nettskjema id: ${submissionId}`, submissionId })
    } catch (error) {
        console.error('Error fetching info from zammad', error.message)
        res.status(500).send('Internal server error')}
}

export default router