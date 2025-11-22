import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { readFile } from 'fs/promises'

const router = express.Router()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

router.get('/sex', getBioSex)
router.get('/agecategory', getAgeCategory)
router.get('/handedness', getHandedness)
router.get('/species', getSpecies)

async function getBioSex(req, res) {
    const filePath = path.join(__dirname, '../data/controlledTerms/BiologicalSex.json');
    try {
        let biosex
        try {
            const data = await readFile(filePath, 'utf-8')
            biosex = JSON.parse(data)
        } catch (err) {
            biosex = []} 
        res.status(200).json({ biosex })
    } catch (error) {
        console.error('Error fetching bio sex from backend', error.message)
        res.status(500).send('Internal server error')}
}  

async function getAgeCategory(req, res) {
    const filePath = path.join(__dirname, '../data/controlledTerms/AgeCategory.json')
    try {
        let age_cat
        try {
          const data = await readFile(filePath, 'utf-8')
          age_cat = JSON.parse(data)
          if (!age_cat) {throw new Error(`Error reading json file at backend`)}
        } catch (err) {
            age_cat = []
        } 
        //console.log('age_cat:', age_cat)
      res.status(200).json({ age_cat})
    } catch (error) {
      console.error('Error fetching data from backend', error.message)
      res.status(500).send('Internal server error')}
} 
  
async function getHandedness(req, res) {
    const filePath = path.join(__dirname, '../data/controlledTerms/Handedness.json')
    try {
        let handedness
        try {
            const data = await readFile(filePath, 'utf-8')
            handedness = JSON.parse(data)
            if (!handedness) {throw new Error(`Error reading json file at backend`)}
        } catch (err) {
            handedness = []
        } 
      //console.log('handedness', handedness)  
      res.status(200).json({ handedness })
    } catch (error) {
      console.error('Error fetching data from backend', error.message)
      res.status(500).send('Internal server error')}
} 

async function getSpecies(req, res) {
    const filePath = path.join(__dirname, '../data/controlledTerms/Species.json');
    try {
        let species
        try {
            const data = await readFile(filePath, 'utf-8')
            species = JSON.parse(data)
            if (!species) {throw new Error(`Error reading json file at backend`)}
        } catch (err) {
            species = []} 
        res.status(200).json({ species })
    } catch (error) {
        console.error('Error fetching data from backend', error.message)
        res.status(500).send('Internal server error')}} 

export default router