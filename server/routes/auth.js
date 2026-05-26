import express from 'express'
import dotenv from 'dotenv'
import crypto from 'crypto'
import tokenFunctions from './tokenManager.js'
dotenv.config()

const EBRAINS_IAM_SERVER = "https://iam.ebrains.eu/auth/realms/hbp"
const TOKEN_ENDPOINT     = EBRAINS_IAM_SERVER + "/protocol/openid-connect/token"
const AUTH_ENDPOINT      = EBRAINS_IAM_SERVER + "/protocol/openid-connect/auth"
const LOGOUT_ENDPOINT    = EBRAINS_IAM_SERVER + "/protocol/openid-connect/logout"

// ── fallback: KG user endpoint if id_token parsing fails ─────────────────────
const KG_USER_URL = "https://core.kg.ebrains.eu/v3/users/me"
const KG_USER_MAP = {
  username: 'http://schema.org/alternateName',
  fullname:  'http://schema.org/name',
  email:     'http://schema.org/email'
}

const REDIRECT_URI = process.env.WIZARD_OIDC_CLIENT_REDIRECT_URL
                  || 'https://metadata-wizard-dev.apps.ebrains.eu/'

const router     = express.Router()
const stateStore = new Map()
const STATE_TTL_MS = 5 * 60 * 1000   // 5 minutes

// ── state helpers ─────────────────────────────────────────────────────────────

function genState() {
  return crypto.randomBytes(32).toString('hex')
}

function storeState(state, payload) {
  const expiresAt = Date.now() + STATE_TTL_MS
  stateStore.set(state, { payload, expiresAt })
  setTimeout(() => {
    const entry = stateStore.get(state)
    if (entry && entry.expiresAt <= Date.now()) stateStore.delete(state)
  }, STATE_TTL_MS + 1000)
}

function consumeState(state) {
  const entry = stateStore.get(state)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) { stateStore.delete(state); return null }
  stateStore.delete(state)
  return entry.payload
}

// ── JWT helpers — decode id_token without verifying signature ─────────────────
// The token came directly from the IAM server over HTTPS so we trust it.
// We only need the payload claims, not signature verification.

function decodeJwtPayload(jwt) {
  try {
    const parts = jwt.split('.')
    if (parts.length !== 3) return null
    // base64url → base64 → Buffer → JSON
    const padded  = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const decoded = Buffer.from(padded, 'base64').toString('utf-8')
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

function extractUserFromIdToken(idToken) {
  const claims = decodeJwtPayload(idToken)
  if (!claims) return null

  // EBRAINS id_token standard claims:
  // sub, name, preferred_username, given_name, family_name, email
  const fullname  = claims.name              || ''
  const username  = claims.preferred_username|| ''
  const email     = claims.email             || ''
  const firstName = claims.given_name        || ''
  const lastName  = claims.family_name       || ''

  if (!username && !email && !fullname) return null

  console.log(`User from id_token: ${fullname} <${email}> (@${username})`)
  return { username, fullname, email, firstName, lastName }
}

// ── fallback: fetch user from KG endpoint ─────────────────────────────────────

async function fetchUserFromKG(accessToken, signal) {
  try {
    const resp = await fetch(KG_USER_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      signal
    })
    if (!resp.ok) {
      console.warn(`KG user endpoint returned ${resp.status} — skipping`)
      return null
    }
    const body = await resp.json()
    const data = body.data || {}
    const userInfo = {}
    Object.keys(KG_USER_MAP).forEach(key => { userInfo[key] = data[KG_USER_MAP[key]] })
    console.log('User from KG endpoint:', userInfo)
    return userInfo
  } catch (err) {
    if (err.name === 'AbortError') throw err
    console.warn('KG user endpoint failed:', err.message)
    return null
  }
}

// ── routes ────────────────────────────────────────────────────────────────────

router.get('/loginurl',  getLoginUrl)
router.get('/logouturl', getLogOutUrl)
router.get('/token',     getToken)
router.get('/hello',     (req, res) => res.json({ message: 'Hello from auth route' }))

// ── GET /loginurl ─────────────────────────────────────────────────────────────

async function getLoginUrl(req, res) {
  try {
    const clientId = process.env.WIZARD_OIDC_CLIENT_ID
    if (!REDIRECT_URI || !clientId) throw new Error('Missing redirect url and client ID')

    const payload = {}
    if (req.query?.TicketNumber) payload.ticket = req.query.TicketNumber

    const state = genState()
    storeState(state, payload)

    const params = new URLSearchParams({
      response_type: 'code',
      client_id:     clientId,
      scope:         'openid',
      redirect_uri:  REDIRECT_URI,
      state,
      login:         'true'
    })

    res.status(200).send(AUTH_ENDPOINT + '?' + params.toString())
  } catch (error) {
    console.error('Error building login URL:', error.message)
    res.status(500).send('Internal server error')
  }
}

// ── GET /token ────────────────────────────────────────────────────────────────

async function getToken(req, res) {
  const controller = new AbortController()
  const onClose    = () => { console.warn('Client disconnected'); controller.abort() }
  req.on('close', onClose)

  try {
    const { code: authorizationCode, state } = req.query

    if (!authorizationCode) throw new Error('Missing authorization code.')
    if (!state)             throw new Error('Missing state parameter.')

    const storedPayload = consumeState(state)
    if (!storedPayload) {
      console.warn('Invalid or expired state:', state)
      return res.status(400).send({ error: 'Invalid or expired state' })
    }

    const clientId     = process.env.WIZARD_OIDC_CLIENT_ID
    const clientSecret = process.env.WIZARD_OIDC_CLIENT_SECRET
    if (!clientId || !clientSecret) throw new Error('Missing client credentials.')

    // ── 1. exchange code for tokens ───────────────────────────────────────────
    const params = new URLSearchParams({
      grant_type:    'authorization_code',
      code:          authorizationCode,
      client_id:     clientId,
      client_secret: clientSecret,
      redirect_uri:  REDIRECT_URI
    })

    console.log('Exchanging code at token endpoint…')
    const tokenResponse = await fetch(TOKEN_ENDPOINT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    params.toString(),
      signal:  controller.signal
    })

    const text = await tokenResponse.text().catch(() => null)
    if (!tokenResponse.ok) {
      console.error('Token endpoint error:', tokenResponse.status, text)
      return res.status(502).send({ error: 'Failed to fetch token from IAM', details: text })
    }

    const tokenData = JSON.parse(text)
    const { access_token, id_token, expires_in, refresh_token, refresh_expires_in } = tokenData

    console.log(`Token received — expires in ${expires_in}s`)

    // ── store token for background KG fetches ─────────────────────────────────
    tokenFunctions.setAccessToken(
      clientId, clientSecret,
      access_token, expires_in,
      refresh_token, refresh_expires_in
    )

    // ── 2. extract user info — id_token first, KG endpoint as fallback ────────
    let userInfo = null

    if (id_token) {
      userInfo = extractUserFromIdToken(id_token)
      if (userInfo) {
        console.log('User info resolved from id_token — no extra network call needed')
      }
    }

    if (!userInfo) {
      console.log('id_token parsing failed or missing — falling back to KG user endpoint')
      userInfo = await fetchUserFromKG(access_token, controller.signal)
    }

    if (!userInfo) {
      // ── cannot identify the user but auth succeeded — let the frontend
      // decide what to do (it can show a reload prompt)
      console.warn('Could not resolve user info from either id_token or KG endpoint')
      return res.status(200).send({
        success: false,
        user:    null,
        ticket:  storedPayload.ticket,
        message: 'Authenticated but user info unavailable — please reload'
      })
    }

    return res.status(200).send({
      success: true,
      user:    userInfo,
      ticket:  storedPayload.ticket
    })

  } catch (error) {
    if (error?.name === 'AbortError') {
      console.log('Token fetch aborted — client disconnected')
      if (!res.headersSent) { try { res.status(499).end() } catch { /* ignore */ } }
      return
    }
    console.error('Error in getToken:', error?.message ?? error)
    if (!res.headersSent) res.status(500).send('Backend server error')
  } finally {
    req.off('close', onClose)
  }
}

// ── GET /logouturl ────────────────────────────────────────────────────────────

async function getLogOutUrl(req, res) {
  try {
    let redirectUrl = REDIRECT_URI
    if (!redirectUrl) throw new Error('Missing redirect url')
    if (req.query && Object.keys(req.query).length > 0) {
      const searchParamString = new URLSearchParams(req.query).toString()
      if (searchParamString) redirectUrl += '?' + searchParamString
    }
    const params    = new URLSearchParams({ redirect_uri: redirectUrl })
    const logoutUrl = LOGOUT_ENDPOINT + '?' + params.toString()
    res.status(200).send(logoutUrl)
  } catch (error) {
    console.error('Error building logout URL:', error.message)
    res.status(500).send('Internal server error')
  }
}

export default router