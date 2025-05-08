import express from 'express'
import {getRequestOptions} from '../KG_utils/kgAuthentication.js'

const router = express.Router()
router.get('/contributors', getContributors)

async function getContributors(req, res) {
    const OPENMINDS_VOCAB = "https://openminds.ebrains.eu/vocab"
    const API_BASE_URL = "https://core.kg.ebrains.eu/"
    const API_ENDPOINT = "v3/instances"
    const QUERY_PARAMS = ["stage=RELEASED", "space=common", "type=https://openminds.ebrains.eu/core/"]
    const TYPE_NAME = "Person"
    const queryUrl = `${API_BASE_URL}${API_ENDPOINT}?${QUERY_PARAMS.join("&")}${TYPE_NAME}`
    const properties = ["familyName", "givenName"]
    console.log('get contributors function is running')
    try {
        let personKG =[]
        const requestOptions = await getRequestOptions()
        console.log(queryUrl)
        const response = await fetch(queryUrl, requestOptions)
        //console.log(response)
        if (response.status === 200) {
            const data = await response.json()
            console.log(response)
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
            const jsonStr = JSON.stringify(typeInstanceList, null, 2)
            personKG.push(jsonStr)
        } else { throw new Error('Error fetching instances for contributors. Status code: ' + response.status)}

      res.json({
        success: true,
        personKG: personKG 
    })
    } catch (error) {
      console.error('Error fetching contributors from KG', error.message);
      res.status(500).send('Internal server error');
    }
  }

export default router;    