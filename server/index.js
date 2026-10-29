import express from 'express'
import ViteExpress from "vite-express"
import cors from 'cors'
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
import collabDraft from './routes/collabDraft.js'
import mistralRoutes from './routes/mistral.js'
import bucketRoutes from './routes/bucketStructure.js'
import ddRender from './routes/ddRender.js'
import { resetFundingInProgressFlag } from './KG_utils/fetchDataFromKG.js'


dotenv.config({ path: '../.env' })
const PORT = process.env.PORT_SERVER || 4000
const app = express()

app.use(express.json({ limit: '10mb' }))
// Request log: only API calls (not pages or static files), without query strings except a few ids.
// Never the OAuth "code"/"state" of the login redirect. Routine reference-data and keep-alive calls are debug only.
const QUIET_PATHS = ['/api/auth/keepalive', '/api/kginfo/', '/api/subjects/']
const LOGGED_PARAMS = ['TicketNumber', 'NettskjemaId', 'datasetVersionId']
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
        const ids = LOGGED_PARAMS.filter(k => req.query?.[k]).map(k => `${k}=${req.query[k]}`)
        const line = `${req.method} ${req.path}${ids.length ? ` ?${ids.join('&')}` : ''}`
        if (QUIET_PATHS.some(q => req.path.startsWith(q))) logger.debug(line)
        else logger.info(line)
    }
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

// Fetch initially when the server starts
fetchDataFromKg()

// Schedule fetching data from KG every 15 minutes (900000 ms), 24 hours (86400000 ms)
setInterval(() => {
  //resetFundingInProgressFlag()  // ← allow re-fetch next login
  fetchDataFromKg()
}, 86400000)

app.use('/api/', formRoutes)
app.use('/api/auth/', authRoutes)
app.use('/api/kginfo/', KGinfoRoutes)
app.use('/api/subjects/', KGinfoSubjects)
app.use('/api/zammad/', zammadInfo)
app.use('/api/python/', runpython)
app.use('/api/drive/', driveupload)
app.use('/api/drive/', collabDraft)
app.use('/api/mistral/', mistralRoutes)
app.use('/api/bucket/', bucketRoutes)
app.use('/api/dd/', ddRender)

app.get('/health', (req, res) => res.status(200).send('ok'))
app.get('/api/test', (req, res) => res.send('BACKEND_OK'))

ViteExpress.listen(app, PORT, () => logger.info(`Server running on ${PORT}`))