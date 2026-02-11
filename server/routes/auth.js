//to keep ticket number when redirecting: Use the OIDC state parameter 
import express from 'express'
import dotenv from 'dotenv'
import crypto from 'crypto'
import tokenFunctions from './tokenManager.js'
dotenv.config()

const EBRAINS_IAM_SERVER = "https://iam.ebrains.eu/auth/realms/hbp"
const TOKEN_ENDPOINT = EBRAINS_IAM_SERVER + "/protocol/openid-connect/token"
const AUTH_ENDPOINT = EBRAINS_IAM_SERVER + "/protocol/openid-connect/auth"
const LOGOUT_ENDPOINT = EBRAINS_IAM_SERVER + "/protocol/openid-connect/logout"
const USERINFO_ENDPOINT = EBRAINS_IAM_SERVER + "/protocol/openid-connect/userinfo"
const USER_INFO_URL = "https://core.kg.ebrains.eu/v3/users/me"
const userMap = {
  username: 'http://schema.org/alternateName',
  fullname: 'http://schema.org/name',
  email: 'http://schema.org/email'
}

const router = express.Router()

const stateStore = new Map()
const STATE_TTL_MS = 5 * 60 * 1000 // 5 minutes

function genState() {
  return crypto.randomBytes(32).toString('hex') 
}

function storeState(state, payload) {
  const expiresAt = Date.now() + STATE_TTL_MS
  stateStore.set(state, { payload, expiresAt })
  // cleanup 
  setTimeout(() => {
    const entry = stateStore.get(state)
    if (entry && entry.expiresAt <= Date.now()) stateStore.delete(state)
  }, STATE_TTL_MS + 1000)
}

function consumeState(state) {
  const entry = stateStore.get(state)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    stateStore.delete(state)
    return null
  }
  stateStore.delete(state)
  return entry.payload
}

router.get('/loginurl', getLoginUrl)
router.get('/logouturl', getLogOutUrl)
//router.get('/user', getUser)
router.get('/token', getToken)
router.get('/hello', helloAuth)

async function helloAuth (req, res) {
  res.json({ message: 'Hello from auth route' })
  console.log(`${req.method} ${req.url}`)
}

// REDIRECT_URI must exactly match the one registered in the OIDC client.
const REDIRECT_URI = process.env.WIZARD_OIDC_CLIENT_REDIRECT_URL || 'https://metadata-wizard-dev.apps.ebrains.eu/'

async function getLoginUrl(req, res) {
  try {
    const clientId = process.env.WIZARD_OIDC_CLIENT_ID
    if (!REDIRECT_URI || !clientId) { throw new Error('Missing redirect url and client ID') }
    const payload = {}
    if (req.query) {
      if (req.query.TicketNumber) payload.ticket = req.query.TicketNumber
      //if (req.query.ticket) payload.ticket = req.query.ticket
    }

    const state = genState()
    storeState(state, payload)

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      scope: 'openid',
      redirect_uri: REDIRECT_URI,
      state,
      login: 'true'
    })

    //console.log('Auth URL params:', params.toString())
    res.status(200).send(AUTH_ENDPOINT + '?' + params.toString())
  } catch (error) {
    console.error('Error fetching IAM url from backend', error.message)
    res.status(500).send('Internal server error')
  }
}

async function getToken(req, res) {
  const controller = new AbortController()
  const onClose = () => {
    console.warn('Client disconnected, aborting request to iam')
    controller.abort()
  }
  req.on('close', onClose)

  try {
    const authorizationCode = req.query.code
    const state = req.query.state

    if (!authorizationCode) {
      throw new Error('Missing authorization code.')
    }
    if (!state) {
      throw new Error('Missing state parameter.')
    }

    const storedPayload = consumeState(state)
    if (!storedPayload) {
      console.warn('Invalid or expired state:', state)
      return res.status(400).send({ error: 'Invalid or expired state' })
    }

    const clientId = process.env.WIZARD_OIDC_CLIENT_ID
    const clientSecret = process.env.WIZARD_OIDC_CLIENT_SECRET
    if (!clientId || !clientSecret) {
      throw new Error('Missing client credentials.')
    }

    // redirect_uri must match the one used in getLoginUrl.
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: authorizationCode,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI
    })

    console.log('Exchanging code at token endpoint (backend)')
    const requestOptions = {
      method: 'post',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      signal: controller.signal
    }

    //console.log('token endpoint request options:', { ...requestOptions, body: 'REDACTED' })
    const tokenResponse = await fetch(TOKEN_ENDPOINT, requestOptions)
    const text = await tokenResponse.text().catch(() => null)

    if (!tokenResponse.ok) {
      console.error('Token endpoint returned error', tokenResponse.status, text)
      return res.status(502).send({ error: 'Failed to fetch token from IAM', details: text })
    }

    const tokenData = JSON.parse(text)
    console.log('token expires in:', tokenData["expires_in"])

    if (tokenData) {
      const expiresIn = tokenData.expires_in
      const refresh_token = tokenData.refresh_token
      const refresh_token_exp = tokenData.refresh_expires_in
      const access_token = tokenData["access_token"]
      tokenFunctions.setAccessToken(clientId, clientSecret, access_token, expiresIn, refresh_token, refresh_token_exp)

      console.log('outbound fetch for userinfo')
      const userResponse = await fetch(`${USER_INFO_URL}`, {
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      })

      if (!userResponse.ok) {
        throw new Error(`Failed to get user, status: ${userResponse.status}`)
      }

      const responseData = await userResponse.json()
      const data = responseData.data
      let userInfo = {}
      Object.keys(userMap).forEach(key => {
        userInfo[key] = data[userMap[key]]
      })
      console.log('user info from KG endpoint:', userInfo)

      const result = {
        user: userInfo,
        ticket: storedPayload.ticket 
      }
      res.status(userResponse.status).send(result)
    } else {
      throw new Error('Could not fetch personal token')
    }
  } catch (error) {
    if (error && error.name === 'AbortError') {
      console.log('Outbound token fetch aborted due to client disconnect.')
      if (!res.headersSent) {
        try { res.status(499).end() } catch (e) { /* ignore */ }
      }
      return
    }
    console.error('Error fetching personal token from IAM:', error && error.message ? error.message : error)
    if (!res.headersSent) return res.status(500).send('Backend server error')
  } finally {
    req.off('close', onClose)
  }
}

async function getLogOutUrl(req, res) {
  try {
    let redirectUrl = REDIRECT_URI
    if (!redirectUrl) { throw new Error('Missing redirect url') }
    if (req.query && Object.keys(req.query).length > 0) {
      const searchParamString = new URLSearchParams(req.query).toString()
      if (searchParamString) redirectUrl += '?' + searchParamString
    }
    const params = new URLSearchParams({ redirect_uri: redirectUrl })
    const logoutUrl = LOGOUT_ENDPOINT + '?' + params.toString()
    res.status(200).send(logoutUrl)
  } catch (error) {
    console.error('Error occurred while fetching logout url from backend:', error.message)
    res.status(500).send('Internal server error')
  }
}

// this route is not used, because of CORS policies
/*
async function getUser(req, res) {
  try {
    const token = req.headers.authorization
    if (!token) { throw new Error('Missing token') }
    const userResponse = await fetch(USERINFO_ENDPOINT, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (!userResponse.ok) {
      throw new Error(`problem fetching user info: ${userResponse.status}`)
    }
    const userData = await userResponse.json()
    if (userData) {
      const userInfo = {
        name: userData.name,
        preferred_username: userData.preferred_username,
        given_name: userData.given_name,
        family_name: userData.family_name,
        email: userData.email,
      }
      res.status(userResponse.status).send(userInfo)
    } else {
      throw new Error('Could not fetch user data')
    }
  } catch (error) {
    console.error('Error occurred while fetching user:', error.message)
    res.status(500).send('Internal server error')
  }
}
*/
export default router
