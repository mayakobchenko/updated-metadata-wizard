import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const keyPath = path.resolve(__dirname, 'cert/key.pem');
const certPath = path.resolve(__dirname, 'cert/cert.pem');

console.log(`Key Path: ${keyPath}`);
console.log(`Cert Path: ${certPath}`);
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: parseInt(process.env.VITE_PORT) || 8080,
    https: {
      key: fs.readFileSync(path.resolve(__dirname, 'cert/key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, 'cert/cert.pem')),
    },
    proxy: {
      //forward all requests starting with /api to the Express server
      '/api': {
        target: 'http://127.0.0.1:4000', 
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
