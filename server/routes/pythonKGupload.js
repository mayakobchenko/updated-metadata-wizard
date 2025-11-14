//a workaround to use python fairgraph package for KG uploading
import express from 'express'
import dotenv from 'dotenv'
import { exec } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import { writeFile } from 'fs/promises'
import tokenFunctions from './tokenManager.js'

dotenv.config()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

router.get('/hello', sayHello)  //test endpoint
router.post('/runpython', runPythonScript)

//test endpoint
async function sayHello(req, res) {
  res.json({ message: 'Hello from python uploading route' })
  console.log(`${req.method} ${req.url}`)
} 

// Endpoint to save metadata JSON locally inside container and run Python script for KG upload
async function runPythonScript(req, res) {
    const jsonData = req.body
    const jsonFilePath = path.join(__dirname, 'data.json')
    try {
        await writeFile(jsonFilePath, JSON.stringify(jsonData, null, 2))
        const scriptPath = path.join(__dirname, './python_scripts/python_upload_json.py')

        //get the dataset verison id/collab id for space
        
        const kg_token = await tokenFunctions.getWorkingToken()

        exec(`python "${scriptPath}" "${kg_token}" "${jsonFilePath}"`, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`)
                return res.status(500).json({ error: error.message || 'Python code execution error.' })
            }

            const errorToIgnoreMessages = [
                "Property 'digital_identifier' is required but was not provided.",
                "Property 'ethics_assessment' is required but was not provided.",
                "Property 'full_documentation' is required but was not provided.",
                "Property 'license' is required but was not provided.",
                "Property 'release_date' is required but was not provided.",
                "Property 'techniques' is required but was not provided.",
                "Property 'version_identifier' is required but was not provided.",
                "Property 'version_innovation' is required but was not provided."
            ]
            const shouldIgnoreError = errorToIgnoreMessages.some(msg => stderr.includes(msg))
            
            if (stderr && !shouldIgnoreError) {
                console.error(`stderr: ${stderr}`);
                return res.status(500).json({ error: stderr })
            }
            
            try {const jsonResponse = JSON.parse(stdout)
                 res.json(jsonResponse)
            } catch (parseError) {
                console.error(`Parse error: ${parseError}`)
                res.status(500).json({ error: 'Failed to parse Python script output' })
            }
        })
        
    } catch (writeError) {
        console.error(`JSON file write error: ${writeError}`)
        return res.status(500).json({ error: 'Failed to write JSON file' })}}

export default router
