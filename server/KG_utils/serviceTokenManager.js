import dotenv from 'dotenv'
dotenv.config()

const TOKEN_ENDPOINT = 'https://iam.ebrains.eu/auth/realms/hbp/protocol/openid-connect/token'

let _serviceToken = null
let _tokenExpiry  = 0

export async function getServiceToken() {
  // return cached token if still valid (60s buffer)
  if (_serviceToken && Date.now() < _tokenExpiry - 60000) {
    return _serviceToken
  }

  const username     = process.env.EBRAINS_SERVICE_USERNAME
  const password     = process.env.EBRAINS_SERVICE_PASSWORD
  const clientId     = process.env.WIZARD_OIDC_CLIENT_ID
  const clientSecret = process.env.WIZARD_OIDC_CLIENT_SECRET  // ← add this

  if (!username || !password || !clientId || !clientSecret) {
    throw new Error(
      'EBRAINS_SERVICE_USERNAME, EBRAINS_SERVICE_PASSWORD, ' +
      'WIZARD_OIDC_CLIENT_ID and WIZARD_OIDC_CLIENT_SECRET must all be set'
    )
  }

  console.log(`serviceTokenManager: fetching token for ${username}…`)

  const params = new URLSearchParams({
    grant_type:    'password',
    client_id:     clientId,
    client_secret: clientSecret,   // ← add this
    username,
    password,
  })

  const resp = await fetch(TOKEN_ENDPOINT, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    params.toString(),
  })

  if (!resp.ok) {
    const body = await resp.text().catch(() => '')
    throw new Error(`serviceTokenManager: token fetch failed ${resp.status}: ${body.slice(0, 200)}`)
  }

  const data    = await resp.json()
  _serviceToken = data.access_token
  _tokenExpiry  = Date.now() + (data.expires_in || 300) * 1000

  console.log(`serviceTokenManager: token obtained, expires in ${data.expires_in}s`)
  return _serviceToken
}