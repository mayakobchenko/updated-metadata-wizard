import express from 'express'
import {getRequestOptions} from '../KG_utils/kgAuthentication.js'
import path from 'path'
import { fileURLToPath } from 'url'
import { readFile } from 'fs/promises'

const router = express.Router()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

router.get('/contributors', getContributors)
router.get('/consortium', getConsortium)
router.get('/contributorsfile', getContributorsfile)

const OPENMINDS_VOCAB = "https://openminds.ebrains.eu/vocab"
const API_BASE_URL = "https://core.kg.ebrains.eu/"
const API_ENDPOINT = "v3/instances"
const QUERY_PARAMS = ["stage=RELEASED", "space=common", "type=https://openminds.ebrains.eu/core/"]

//this route can be used for direct fetching from KG
async function getContributors(req, res) {
    const TYPE_NAME = "Person"
    const queryUrl = `${API_BASE_URL}${API_ENDPOINT}?${QUERY_PARAMS.join("&")}${TYPE_NAME}`
    const properties = ["familyName", "givenName"]
    console.log('get contributors function is running')
    try {
        let personKG =[]
        const requestOptions = await getRequestOptions()
        //console.log(queryUrl)
        const response = await fetch(queryUrl, requestOptions)
        //console.log(response)
        if (response.status === 200) {
            const data = await response.json()
            //console.log(response)
            let typeInstanceList = [];
            for (let thisInstance of data.data) {
                let newInstance = { "identifier": thisInstance["@id"] };
                let isEmpty = true;
                for (let propertyName of properties) {
                    const vocabName = `${OPENMINDS_VOCAB}/${propertyName}`;
                    if (thisInstance[vocabName] !== undefined) {
                        isEmpty = false;
                        newInstance[propertyName] = thisInstance[vocabName];
                    }
                }
                if (!isEmpty) {
                    typeInstanceList.push(newInstance);
                }
            }
            //const jsonStr = JSON.stringify(typeInstanceList, null, 2)
            personKG.push(typeInstanceList)
        } else { throw new Error('Error fetching instances for contributors. Status code: ' + response.status)}
      console.log(personKG)
      res.json({personKG})
    } catch (error) {
      console.error('Error fetching contributors from KG', error.message);
      res.status(500).send('Internal server error');
    }
  }

async function getConsortium(req, res) {
    //const TYPE_NAME = "consortium"
    //const queryUrl = `${API_BASE_URL}${API_ENDPOINT}?${QUERY_PARAMS.join("&")}${TYPE_NAME}`
    //const properties = ["identifier", "fullName"]
    const filePath = path.join(__dirname, '../data/kg-instances/Consortium.json');
    console.log('get consortium function is running')
    try {
        let consortium
        try {
            const data = await readFile(filePath, 'utf-8')
            consortium = JSON.parse(data)
        } catch (err) {
            consortium = []} 
        res.status(200).json({ consortium })
    } catch (error) {
        console.error('Error fetching contributors from KG', error.message)
        res.status(500).send('Internal server error')}
}  

async function getContributorsfile(req, res) {
    const filePath = path.join(__dirname, '../data/kg-instances/Person.json');
    console.log('get person file function is running')
    try {
        let person
        try {
          const data = await readFile(filePath, 'utf-8')
          person = JSON.parse(data)
        } catch (err) {
          person = []} 
      res.status(200).json({ person })
    } catch (error) {
      console.error('Error fetching contributors from KG', error.message)
      res.status(500).send('Internal server error')}
  }  

export default router