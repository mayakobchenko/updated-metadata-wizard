// typeSpecification object should contain the following properties:
// - openMindsType // short name for the openminds type, e.g: "Person"
// - typeProperties // list of properties to save for this type, e.g: ["familyName", "givenName"]
// - space // Optional, defaults to "common" (KG space to search for instances)
// https://core.kg.ebrains.eu/swagger-ui

import fs from 'fs'
import path from 'path'
import {getRequestOptions} from './kgAuthentication.js'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'kg-instances')
const OPENMINDS_VOCAB = "https://openminds.ebrains.eu/vocab"

fs.mkdir(OUTPUT_DIR, { recursive: true }, (err) => {
    if (err) {
        if (err.code === 'EEXIST') {console.log("Directory already exists.")} 
        else {console.log(err)}
    } else {console.log("New directory successfully created.")}})

export const fetchCoreSchemaInstances = async (typeSpecifications) => {
    const requestOptions = await getRequestOptions()
    const API_BASE_URL = "https://core.kg.ebrains.eu/"
    const API_ENDPOINT = "v3/instances"

    const fetchPromises = typeSpecifications.map(async (typeSpecification) => {
        const spaceName = typeSpecification.space !== undefined ? typeSpecification.space : "common"
        const QUERY_PARAMS = ["stage=RELEASED", `space=${spaceName}`, "type=https://openminds.ebrains.eu/core/"]
        const TYPE_NAME = typeSpecification.openMindsType
        const queryUrl = `${API_BASE_URL}${API_ENDPOINT}?${QUERY_PARAMS.join("&")}${TYPE_NAME}`
        try {
            await fetchInstances(queryUrl, requestOptions, TYPE_NAME, typeSpecification.typeProperties)
        } catch (error) {
            console.error(`Error fetching instances for ${TYPE_NAME}:`, error)
        }
    });
    await Promise.all(fetchPromises)
};

async function fetchInstances(apiQueryUrl, requestOptions, typeName, propertyNames) {
    try {
        const response = await fetch(apiQueryUrl, requestOptions)
        if (response.status === 200) {
            const data = await response.json();
            await parseAndSaveData(data, typeName, propertyNames)
        } else { throw new Error('Error fetching instances for ' + typeName + '. Status code: ' + response.status);}
    } catch (error) {
        console.log(`Error fetching instances for ${typeName}:`, error)
    }
}

async function parseAndSaveData(data, typeName, propertyNameList) {
    let typeInstanceList = [];
    try {
        for (let thisInstance of data.data) {
            let newInstance = { "identifier": thisInstance["@id"] };
            let isEmpty = true;
            for (let propertyName of propertyNameList) {
                const vocabName = `${OPENMINDS_VOCAB}/${propertyName}`
                if (thisInstance[vocabName] !== undefined) {
                    isEmpty = false
                    newInstance[propertyName] = thisInstance[vocabName]}}
            if (!isEmpty) {
                typeInstanceList.push(newInstance)}
        }
        const jsonStr = JSON.stringify(typeInstanceList, null, 2);
        const filename = `${typeName}.json`;
        const filePath = path.join(OUTPUT_DIR, filename)
        await fs.promises.writeFile(filePath, jsonStr);
        console.log('File with instances for ' + typeName + ' written successfully');
    } catch (error) {
        console.error(`Error while parsing and saving data for ${typeName}:`, error)}
}
