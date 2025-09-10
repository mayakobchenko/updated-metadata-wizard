import express from 'express'
import dotenv from 'dotenv'
import { exec } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()
router.get('/hello', sayHello)
router.get('/runpython', runPythonScript)

async function sayHello(req, res) {
  res.json({ message: 'Hello from python uploading route' })
  console.log(`${req.method} ${req.url}`)
} 

async function runPythonScript(req, res) {
    const scriptPath = path.join(__dirname, './python_scripts/python_upload_kg.py')
    console.log(`Script Path: ${scriptPath}`)
    exec(`python ${scriptPath}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`)
            return res.status(500).send(`Error: ${error.message}`);
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`)
            return res.status(500).send(`Error: ${stderr}`)
        }
        console.log(`stdout: ${stdout}`)

        try {
            const jsonResponse = JSON.parse(stdout)
            res.json(jsonResponse)
        } catch (parseError) {
            console.error(`Parse error: ${parseError}`)
            res.status(500).json({ error: 'Failed to parse Python script output' })
        }
    })
} 

export default router
