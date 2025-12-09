//upload metadata json to the collab drive
import express from 'express'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { writeFile } from 'fs/promises'
import tokenFunctions from './tokenManager.js'

dotenv.config()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

router.post('/driveupload', runDriveUpload)

async function runDriveUpload(req, res) {
    const jsonData = req.body
    const jsonFilePath = path.join(__dirname, 'metadata_share.json')
    try {
        await writeFile(jsonFilePath, JSON.stringify(jsonData, null, 2))
        //get the dataset verison id/collab id for space
        
        const kg_token = await tokenFunctions.getWorkingToken()
            
        res.json({ message: 'The metadata jsonn file was successfully uploaded to the drive', token: kg_token })
        
    } catch (writeError) {
        console.error(`JSON file write error: ${writeError}`)
        return res.status(500).json({ error: 'Failed to write JSON file' })}}

export default router
