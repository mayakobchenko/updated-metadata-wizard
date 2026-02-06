import express from 'express'
import ViteExpress from 'vite-express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
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
const HOST = process.env.HOST || '0.0.0.0'
const app = express()

// Basic middleware
app.use(express.json())
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`)
  next()
})

app.use(cors({
  origin: 'https://metadata-wizard-dev.apps.ebrains.eu:8080',
  credentials: true
}))

// Schedule fetch (as before)
setInterval(fetchDataFromKg, 86400000)

// Mount all API routers under /api so client requests to /api/... match
app.use('/api', formRoutes)        // now available at /api/...
app.use('/api/auth', authRoutes)   // now available at /api/auth/...
app.use('/api/kginfo', KGinfoRoutes)
app.use('/api/subjects', KGinfoSubjects)
app.use('/api/zammad', zammadInfo)
app.use('/api/python', runpython)
app.use('/api/drive', driveupload)

// Small test endpoint
app.get('/api/test', (req, res) => res.status(200).send('BACKEND_OK'))
app.get('/health', (req, res) => res.status(200).send('ok'))

// Serve static files in production (adjust path if your Docker copies dist to ./server/dist)
if (process.env.NODE_ENV === 'production') {
  const staticDir = path.join(process.cwd(), 'server', 'dist')
  app.use(express.static(staticDir))

  // Fallback to index.html for requests that accept HTML (client-side routing)
  app.get('*', (req, res, next) => {
    const acceptsHtml = req.accepts('html')
    if (!acceptsHtml) return next()
    res.sendFile(path.join(staticDir, 'index.html'), (err) => {
      if (err) next(err)
    })
  })
}

// Start server bound to 0.0.0.0 so it is reachable from service/ingress
// ViteExpress.listen supports same signature as app.listen in many versions, but to be safe:
ViteExpress.listen(app, PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`)
})
