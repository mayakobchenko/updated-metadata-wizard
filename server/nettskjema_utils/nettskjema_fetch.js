import {fetchTokenNettskjema} from './tokenFetcher.js';
import {fetchSubmission, fetchAnswers, fetchPosition} from './fetchNettskjemaData.js';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const clientId = process.env.NETTSKJEMA_CLIENT_ID;
const clientSecret = process.env.NETTSKJEMA_CLIENT_SECRET;
const tokenEndpointUrl = process.env.TOKEN_ENDPOINT_URL; 

/*const body = "grant_type=client_credentials&client_id=" + clientId + "&client_secret=" + clientSecret + "&scope=openid%20group%20roles%20email%20profile%20team";
console.log(body)    
const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64'); 
console.log(basicAuth)*/

const tokenNettskjema = await fetchTokenNettskjema()
//console.log(tokenNettskjema)
const submissionId = 33464654
const submissionData = await fetchSubmission(submissionId, tokenNettskjema);
console.log(submissionData)
//const datasetID = await fetchAnswers(submissionData);

//const respondentName = submissionData['submissionMetadata']['person']['name'];
//const respondentEmail = submissionData['submissionMetadata']['person']['email'];