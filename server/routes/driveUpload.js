//upload metadata json to the collab drive
import express from 'express'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { writeFile } from 'fs/promises'
import { getUserAccessToken } from './userSessions.js'

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
        
        // the person's own login is required; their token is never sent to the browser
        const kg_token = await getUserAccessToken(req)
        if (!kg_token) return res.status(401).json({ error: 'Your EBRAINS login has ended. Please log in again.', code: 'SESSION_EXPIRED' })

        res.json({ message: 'The metadata json file was successfully uploaded to the drive' })
        
    } catch (writeError) {
        console.error(`JSON file write error: ${writeError}`)
        return res.status(500).json({ error: 'Failed to write JSON file' })}}

export default router
