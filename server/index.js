import express from 'express'
import ViteExpress from "vite-express"
import cors from 'cors'; 
import dotenv from 'dotenv'
import logger from './logger.js'
import formRoutes from './routes/metadataSubmission.js'
import authRoutes from './routes/auth.js'
import KGinfoRoutes from './routes/infoKG.js'
import KGinfoSubjects from './routes/infoSubjects.js'
import zammadInfo from './routes/getTicketNettskjemaInfo.js'
import fetchDataFromKg from './KG_utils/fetchDataFromKG.js'
import runpython from './routes/pythonKGupload.js'
import driveupload from './routes/driveUpload.js'

dotenv.config({ path: '../.env' })
const PORT = process.env.PORT_SERVER || 4000
const app = express()

app.use(express.json())
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`)
    //console.log(`${req.method} ${req.url}`);
    next()
})

app.use(cors({
    origin: 'https://metadata-wizard-dev.apps.ebrains.eu:8080',//'https://127.0.0.1:8080', // port for react
    credentials: true
}));

// CORS Middleware Toggle
// if (process.env.ENABLE_CORS === 'true') {
//     app.use(cors());
// }

// Schedule fetching data from KG every 15 minutes (900000 ms), 24 hours (86400000 ms)
setInterval(fetchDataFromKg, 86400000)

// Fetch initially when the server starts
//fetchDataFromKg()

app.use('/', formRoutes)
app.use('/auth/', authRoutes)
app.use('/kginfo/', KGinfoRoutes)
app.use('/subjects/', KGinfoSubjects)
app.use('/zammad/', zammadInfo)
app.use('/python/', runpython)
app.use('/drive/', driveupload)

app.get('/health', (req, res) => res.status(200).send('ok'))

ViteExpress.listen(app, PORT, () => console.log(`Server running on http://127.0.0.1:${PORT}`))
