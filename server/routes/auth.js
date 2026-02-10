import express from 'express'
import dotenv from 'dotenv'
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

router.get('/loginurl', getLoginUrl)
router.get('/logouturl', getLogOutUrl)
router.get('/user', getUser)
router.get('/token', getToken)

//to test the auth route: 
router.get('/hello', helloAuth)
async function helloAuth (req, res) {
  res.json({ message: 'Hello from auth route' })
  console.log(`${req.method} ${req.url}`)
}

//https://wiki.ebrains.eu/bin/view/Collabs/the-collaboratory/Documentation%20IAM/FAQ/OIDC%20Clients%20explained/Authenticating%20with%20your%20OIDC%20client%20and%20fetching%20collab%20user%20info/     
async function getLoginUrl(req, res) {
  try {
    const clientId = process.env.WIZARD_OIDC_CLIENT_ID
    //let redirectUrl = process.env.WIZARD_OIDC_CLIENT_REDIRECT_URL
    //window.location.href = `${OIDC}?response_type=code&login=true&client_id=${clientId}&redirect_uri=${MY_URL}`
    //let redirectUrl = 'https://127.00.0.1:8080/'
    let redirectUrl = 'https://metadata-wizard-dev.apps.ebrains.eu/'
    if (!redirectUrl || !clientId) {throw new Error('Missing redirect url and client ID')}
    if (req.query && Object.keys(req.query).length > 0) {
      delete req.query.iss
      const searchParamString = new URLSearchParams(req.query).toString()
      if (searchParamString) {redirectUrl += '?' + searchParamString}}
    const params = new URLSearchParams({
      //prompt: 'none',
      login: 'true',
      response_type: 'code',
      client_id: clientId,
      scope: 'openid', // 'team%20collab.drive'  join with space, formating !
      redirect_uri: "https://metadata-wizard-dev.apps.ebrains.eu/",
    })    
    console.log('params for the iam request:', params)
    res.status(200).send(AUTH_ENDPOINT + '?' + params.toString())
  } catch (error) {
    console.error('Error fetching IAM url from backend', error.message)
    res.status(500).send('Internal server error')}
}

/* Claude
async function getToken(req, res) {
    const controller = new AbortController()
    const onClose = () => {
      console.warn('Client disconnected, aborting request to iam')
      controller.abort()
    }
    req.on('close', onClose)
  
    try {      
      const authorizationCode = req.query.code
      console.log('code received by backend:', authorizationCode)
      
      let redirectUrl = process.env.WIZARD_OIDC_CLIENT_REDIRECT_URL || 'https://127.0.0.1:8080/'
      const clientId = process.env.WIZARD_OIDC_CLIENT_ID
      const clientSecret = process.env.WIZARD_OIDC_CLIENT_SECRET
      
      if (!authorizationCode || !redirectUrl || !clientId || !clientSecret) {
        throw new Error('Missing required parameters.')
      }
      
      // Build redirect URL with remaining query params
      if (req.query && Object.keys(req.query).length > 0) {
        const queryParams = {...req.query}
        delete queryParams.code
        delete queryParams.session_state
        delete queryParams.iss
        
        const searchParamString = new URLSearchParams(queryParams).toString()
        if (searchParamString) {
          redirectUrl += '?' + searchParamString
        }
      }
      
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: authorizationCode,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUrl,
      })
      
      console.log('fetching token at backend (outbound fetch to IAM)')
      const requestOptions = {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: params.toString()
      }
      
      const tokenResponse = await fetch(TOKEN_ENDPOINT, requestOptions)
      const text = await tokenResponse.text().catch(() => null)
      
      if (!tokenResponse.ok) {
        console.error('Token endpoint returned error', tokenResponse.status, text)
        return res.status(502).json({ error: 'Failed to fetch token from IAM', details: text })
      }
      
      const tokenData = JSON.parse(text)
      console.log('token expires in:', tokenData.expires_in)
      
      if (tokenData) {
        const expiresIn = tokenData.expires_in
        const refresh_token = tokenData.refresh_token
        const refresh_token_exp = tokenData.refresh_expires_in
        const access_token = tokenData.access_token
        
        // Store token on backend
        tokenFunctions.setAccessToken(clientId, clientSecret, access_token, expiresIn, refresh_token, refresh_token_exp)
        
        console.log('outbound fetch for userinfo')
        const userResponse = await fetch(USER_INFO_URL, {
          headers: {
            'Authorization': `Bearer ${access_token}`,  // Fixed: added Bearer
            'Content-Type': 'application/json'
          }
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
        
        // Return both user and token to frontend
        res.status(200).json({
          user: userInfo,
          token: access_token,  // Send token to frontend
          expiresIn: expiresIn
        })
      } else {
        throw new Error('Could not fetch personal token')
      }
    } catch (error) {
      if (error && error.name === 'AbortError') {
        console.log('Outbound token fetch aborted due to client disconnect.')
        if (!res.headersSent) {
          try { res.status(499).end() } catch (e) { }
        }
        return
      }
      console.error('Error fetching personal token from IAM:', error && error.message ? error.message : error)
      if (!res.headersSent) return res.status(500).json({ error: 'Backend server error' })
    } finally {
      req.off('close', onClose)
    }
}
*/

async function getToken(req, res) {
    const controller = new AbortController()
    //const { signal } = controller
    const onClose = () => {
      console.warn('Client disconnected, aborting request to iam')
      controller.abort()
    }
    req.on('close', onClose)
  
    try {      
      const authorizationCode = req.query.code
      //console.log('code recieved by backend:', authorizationCode)
      //let redirectUrl = process.env.WIZARD_OIDC_CLIENT_REDIRECT_URL
      let redirectUrl = 'https://127.00.0.1:8080/'
      const clientId = process.env.WIZARD_OIDC_CLIENT_ID
      const clientSecret = process.env.WIZARD_OIDC_CLIENT_SECRET
      if (!authorizationCode || !redirectUrl || !clientId || !clientSecret) {
        throw new Error('Missing required parameters.')
      }
      if (req.query && Object.keys(req.query).length > 0) {
        delete req.query.code
        delete req.query.session_state
        delete req.query.iss
        //delete req.query.TicketNumber;
        const searchParamString = new URLSearchParams(req.query).toString()
        if (searchParamString) {
          redirectUrl += '?' + searchParamString
        }
      }
      const params = new URLSearchParams({
        grant_type: 'authorization_code',   //'refresh_token', client id the same url
        code: authorizationCode,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUrl,
      })
      console.log('fetching token at backend (outbound fetch to IAM)')
      const requestOptions = {
        method: 'post',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: params.toString()
      }
      const tokenResponse = await fetch(TOKEN_ENDPOINT, requestOptions)
      const text = await tokenResponse.text().catch(()=>null)
      if (!tokenResponse.ok) {
        console.error('Token endpoint returned error', tokenResponse.status, text)
        //throw new Error(`problemTokenIAM: ${text}`)
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
        console.log('outbout fetch for userinfo')
        const userResponse = await fetch(`${USER_INFO_URL}`, {headers: {authorization: access_token, 'Content-Type': 'application/json'}})
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
               
        res.status(userResponse.status).send(userInfo)
      } else {
        throw new Error('Could not fetch personal token')}
    } catch (error) {
      if (error && error.name === 'AbortError') {
      console.log('Outbound token fetch aborted due to client disconnect.');
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
      //let redirectUrl = process.env.WIZARD_OIDC_CLIENT_REDIRECT_URL
      let redirectUrl = 'https://127.00.0.1:8080/'
      if (!redirectUrl) {throw new Error('Missing redirect url')}
      if (req.query && Object.keys(req.query).length > 0) {
        const searchParamString = new URLSearchParams(req.query).toString()
        if (searchParamString) {
          redirectUrl += '?' + searchParamString}
      }
      const params = new URLSearchParams({redirect_uri: redirectUrl,})
      const logoutUrl = LOGOUT_ENDPOINT + '?' + params.toString() 
      res.status(200).send(logoutUrl)
    } catch (error) {
      console.error('Error occurred while fetching logout url from backend:', error.message);
      res.status(500).send('Internal server error');
    }
}
  
//this route is not used, because of CORS policies
async function getUser(req, res) {
    try {
      const token = req.headers.authorization
      if (!token) {throw new Error('Missing token')}
      const userResponse = await fetch(USERINFO_ENDPOINT, {
        headers: { 'Authorization': `Bearer ${token}` }})
      if (!userResponse.ok) {
        throw new Error(`problem fetching user info: ${response.status}`)
      } 
      const userData = await userResponse.json()
      if (userData){
        const userInfo = {
          name: userData.name,
          preferred_username: userData.preferred_username,
          given_name: userData.given_name,
          family_name: userData.family_name,
          email: userData.email,
      }
      res.status(userResponse.status).send(userInfo)
      } else {throw new Error('Could not fetch user data')}
    } catch (error) {
      console.error('Error occurred while fetching user:', error.message)
      res.status(500).send('Internal server error')
    }
  }

export default router