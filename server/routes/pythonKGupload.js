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
router.get('/hello', sayHello)
router.post('/runpython', runPythonScript)

async function sayHello(req, res) {
  res.json({ message: 'Hello from python uploading route' })
  console.log(`${req.method} ${req.url}`)
} 

// Endpoint to save JSON and run Python script
async function runPythonScript(req, res) {
    const jsonData = req.body
    const jsonFilePath = path.join(__dirname, 'data.json')
    try {
        await writeFile(jsonFilePath, JSON.stringify(jsonData, null, 2))
        const scriptPath = path.join(__dirname, './python_scripts/python_upload_json.py')
        //const scriptPath = path.join(__dirname, './python_scripts/python_try_collab.py')
        //const scriptPath = path.join(__dirname, './python_scripts/load_metadata.py')

        //get a renewed token here
        //get the dataset verison id/collab id for space
        
        const kg_token = await tokenFunctions.getWorkingToken()
        //console.log(`python "${scriptPath}" "${jsonFilePath}" "${kg_token}"`)

        //`python "${scriptPath}" "${jsonFilePath}" "${kg_token}"`

        exec(`python "${scriptPath}" "${kg_token}"`, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`)
                return res.status(500).json({ error: error.message || 'Execution error.' })}
            if (stderr) {
                console.error(`stderr: ${stderr}`)
                return res.status(500).json({ error: stderr })}
            try {
                const jsonResponse = JSON.parse(stdout)
                res.json(jsonResponse)
            } catch (parseError) {
                console.error(`Parse error: ${parseError}`)
                res.status(500).json({ error: 'Failed to parse Python script output' })}})
    } catch (writeError) {
        console.error(`JSON file write error: ${writeError}`)
        return res.status(500).json({ error: 'Failed to write JSON file' })}}

export default router
