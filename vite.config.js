import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function loadDevHttps() {
  try {
    const keyPath = path.resolve(__dirname, 'cert/key.pem')
    const certPath = path.resolve(__dirname, 'cert/cert.pem')
    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      return {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      }
    }
  } catch (e) {
    console.warn('Could not load dev certs:', e)}
  return false
}

const DEV_PORT = parseInt(process.env.VITE_PORT || '8080', 10)

// If you need a runtime API base (client-side), use VITE_API_BASE
// In development you might set VITE_API_BASE='/api', in production your nginx/ingress will route /api
// e.g. fetch(`${import.meta.env.VITE_API_BASE}/endpoint`)
export default defineConfig(({ mode }) => {
  const isDev = mode === 'development'
  return {
    plugins: [react()],
    // Dev server config (only used when running `vite` or `npm run dev`)
    server: {
      host: '127.0.0.1',
      port: DEV_PORT,
      // enable https in dev only if certs exist
      https: isDev ? loadDevHttps() : false,
      // local proxy: forward /api to your local express server during development
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:4000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },

    // Production build options
    build: {
      outDir: 'dist',       // Dockerfile copies this to nginx
      assetsDir: 'assets',  // optional
      sourcemap: false,     // set true only if you need source maps
    },
  }
})
