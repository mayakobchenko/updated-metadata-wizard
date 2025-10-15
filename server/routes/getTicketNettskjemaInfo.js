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

//updated url: https://nettskjema.no/api/v3/swagger-ui/index.html
//to use swagger uncomment console.log(token) below 

//curation request nettskjema id=386195
//https://api.nettskjema.no/v3/form/386195/definition    -> elements  -> elementId
//https://api.nettskjema.no/v3/form/386195/elements
//https://support.humanbrainproject.eu/#ticket/zoom/{ticket_id} 
const searchTitle = 'EBRAINS Curation Request Accepted'
//skjema id = 386195
//https://127.0.0.1:8080/?TicketNumber=4825517
//submission-ID:37004993

const NETTSKJEMA_ELEMENTS_ID = {
    "EmailPersonNettskjema": 5990394,    //What is your e-mail address?
    "RequestType": 5990395,        //Please select your request type, answer options
    "AlreadyContactCuration": 5990396,     //Have you already been in contact with the Curation team? yes,no
    "DatasetUpdate": 5990398,    //Please enter the EBRAINS dataset URL/DOI that you are requesting to update
    "Novelties": 5990399,          //Please provide a brief summary of the novelties of the new version
    "Spicies": 6409074,     //What species did you study
    "DataTypes": 5990401,//What type of data do you wish to share
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
    "Embargo": 5990445,   //yes, no options
    "DescribedArticle": 5990438, //Has your data already been described in a journal article?  yes,no
    "DoiJournal": 5990439,   //article describing data //Please state the DOI(s) of the journal article(s)
    "DataRepo": 5990440, //Has your data already been published elsewhere?
    "UrlDoiRepo": 5990441,  //data published repo  //Please state the DOI(s) or URL(s) to the repository.
    "WillPiblish": 5990442, //Are you planning to submit a manuscript to a peer-reviewed journal that requires that your data are deposited in an appropriate repository, such as EBRAINS?
    "WillSubmitJournal": 5990443, //Please state the name of the journal
    "ChoseEmbargo": 5990444, //Please choose one of the options from below
}

//answer option id
const ANSWERS_ID = {
    "YesContactcustodian": 14472467,
    "NoContactCustodian": 14472468,
    "YesEmbargo": 14472756,
    "NoEmbargo": 14472757,
    "NewDataset": 14472450,   //I am requesting the curation of a new dataset, model or software
    "NewVersionOfExisting": 14472451,  //I am requesting the curation of a new version of an existing dataset, model or software
    "InContactCuration": 14472452,   //yes in contact with curators
    "FirstTime": 14472453,    //no, first time
    "HomoSapiens": 15328168,   //Homo sapiens
    "Macaca": 15328169,    //Macaca mulatta
    "Mus": 15328170,          //Mus musculus
    "Ratus": 15328171,     //Rattus norvegicus
    "OtherSpicies": 15328172,   //Other(s)
    "YesArticle": 14472746,   //Has your data already been described in a journal article?
    "NoArticle": 14472747,
    "DataPublishedYes": 14472748, //Yes, it is stored in a repository
    "PartofDataPublished": 14472749, //Yes, parts are stored in a repository
    "DataNotPublished": 14472750,    //No
    //options: What type of data do you wish to share
    "ExperimentalData": 14472456, //experimental data (raw/derived)
    "SimulationData": 14472457,   //simulation data
    "ComputationalModel": 14472458,  //a computational model
    "Software": 14472459, //software
    "BrainAtlas": 14472460, //brain atlas
    "OtherData": 14472461, //other(s)
    "WillSumbit": 14472751,   //yes to WillPiblish
    "WillNot": 14472752, //no to WillPiblish
    //options for ChoseEmbargo
    "FreeAccess": 15156763, //I want to allow public visibility and access to my dataset as soon as curation is complete
    "RequestEmbargo": 15156764, //I want to request an embargo period for my data for maximum 6 month. Only the metadata should be available to the public. (A DOI will be assigned to the dataset.)
    "KeepPrivate": 15156765, //I want to keep my dataset and the related metadata private until the journal review of the associated paper is finished. (A temporary and private URL for reviewers can be provided.)
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
        
        //check if contact person is the data custodian, this is mandatory questions
        let CustodianInfo 
        const ifcustodian = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.IfContactCustodian)?.answerOptionIds ?? null
        //this works because it is a requested field in the nettskjema 
        if (ifcustodian[0] === ANSWERS_ID.YesContactcustodian) { 
            CustodianInfo = ContactInfo   //if contact is custodian
            CustodianInfo = [...CustodianInfo, custodianORCID, custodianInstitution]} 
        else if (ifcustodian[0]===ANSWERS_ID.NoContactCustodian) {
            const custodianName = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.NameCustodian)?.textAnswer ?? null
            const custodianSurname = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.SurnameCustodian)?.textAnswer ?? null
            const custodianEmail = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.EmailCustodian)?.textAnswer ?? null
            CustodianInfo = [custodianName, custodianSurname, custodianEmail, custodianORCID, custodianInstitution]}
        
        const dataTitle = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.Title)?.textAnswer ?? null 
        
        //if the dataset is new or a new version of existing one
        let isRequestingNew
        const ifNewDataset = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.RequestType)?.answerOptionIds ?? null
        if (ifNewDataset[0] === ANSWERS_ID.NewDataset) { 
            isRequestingNew = true}
        if (ifNewDataset[0] === ANSWERS_ID.NewVersionOfExisting) {
            isRequestingNew = false
        }
        
        let optionsData 
        const selectedDataTypes = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.DataTypes)?.answerOptionIds ?? null
        //this if statement will work only if this question is manadatory in the nettskjema
        if (selectedDataTypes[0] === ANSWERS_ID.ExperimentalData) { 
            optionsData = 'Experimental data'}
        if (selectedDataTypes[0] === ANSWERS_ID.SimulationData) {
            optionsData = [...optionsData, 'Simulated data']}
        const briefSummary = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.BriefSummary)?.textAnswer ?? null
        let embargo 
        const isembargo = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.Embargo)?.answerOptionIds ?? null
        //isembargo ? embargo = true : embargo = false  //answer present in nettskjema only if yes
        if (isembargo!== null) {if (isembargo[0]=== ANSWERS_ID.YesEmbargo) {embargo = true}}

        let willPublish 
        const isWillPublish = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.WillPiblish)?.answerOptionIds ?? null
        if (isWillPublish!== null) {if (isWillPublish[0]=== ANSWERS_ID.WillSumbit) {willPublish = true} else {willPublish = false}}
        let submitJournalName
        if (willPublish) { submitJournalName = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.WillSubmitJournal)?.textAnswer ?? null }
        
        let embargoReview 
        const issubmission = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.ChoseEmbargo)?.answerOptionIds ?? null
        if (issubmission !== null) {
            if (issubmission[0] === ANSWERS_ID.RequestEmbargo) { embargo = true }
            if (issubmission[0] === ANSWERS_ID.KeepPrivate) {
                embargoReview = true
                embargo = true
            }}     

        const DataInfo = [dataTitle, briefSummary, embargo, optionsData, embargoReview, submitJournalName]
        
        const GroupLeaderName = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.GroupLeader)?.textAnswer ?? null    
        const GroupLeaderOrcid = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.ORCIDgroupLeader)?.textAnswer ?? null
        const GroupLeader = [GroupLeaderName, GroupLeaderOrcid]

        const Data2UrlDoiRepo = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.UrlDoiRepo)?.textAnswer ?? null    
        const Data2DoiJournal = answers.find(item => item.elementId === NETTSKJEMA_ELEMENTS_ID.DoiJournal)?.textAnswer ?? null
        const Data2Info = [Data2UrlDoiRepo, Data2DoiJournal]
        //console.log('data2Info', Data2Info)

        res.status(200).json({ ContactInfo: ContactInfo,  CustodianInfo: CustodianInfo, GroupLeader: GroupLeader, DataInfo: DataInfo, Data2Info: Data2Info})
    } catch (error) {
        console.error('Error fetching info from nettskjema, getTicketNettskjemaInfo.js ', error.message)
        res.status(500).send('Internal server error')}
}

export default router