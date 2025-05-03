import express from 'express';
import ViteExpress from "vite-express";
//import cors from 'cors'; 
import dotenv from 'dotenv';
import logger from './logger.js';
import formRoutes from './routes/metadataSubmission.js';
import authRoutes from './routes/auth.js';

dotenv.config({ path: '../.env' });
const PORT = process.env.PORT_SERVER || 4000;
const app = express();

app.use(express.json());
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`);
    //console.log(`${req.method} ${req.url}`);
    next();
});

// CORS Middleware Toggle
// if (process.env.ENABLE_CORS === 'true') {
//     app.use(cors());
// }

app.use('/', formRoutes);
app.use('/auth/', authRoutes);
  
ViteExpress.listen(app, PORT, () => console.log(`Server running on http://127.0.0.1:${PORT}`));
