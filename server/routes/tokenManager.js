let access_token     = ''
let access_token_exp = 0
let refresh_token    = ''
let refresh_token_exp = 0
let working_token    = ''
let client_id        = ''
let client_secret    = ''

const TOKEN_ENDPOINT = 'https://iam.ebrains.eu/auth/realms/hbp/protocol/openid-connect/token'

// ── typed error so callers can distinguish session expiry from other errors ──
export class SessionExpiredError extends Error {
  constructor() {
    super('Session expired. Please reload the page and log in again.')
    this.name = 'SessionExpiredError'
  }
}

const tokenFunctions = {

  setAccessToken(clientId, clientSecret, newAccessToken, expiresIn, refresh, refresh_exp) {
    access_token      = newAccessToken
    access_token_exp  = Date.now() + expiresIn * 1000
    refresh_token     = refresh
    refresh_token_exp = Date.now() + refresh_exp * 1000
    client_id         = clientId
    client_secret     = clientSecret
  },

  isTokenExpired()   { return Date.now() >= access_token_exp },
  isRefreshExpired() { return Date.now() >= refresh_token_exp },
  getAccessToken()   { return access_token },
  getRefreshToken()  { return refresh_token },

  async getWorkingToken() {
    // token still valid — return immediately
    if (access_token && !tokenFunctions.isTokenExpired()) {
      working_token = access_token
      return working_token
    }

    // access token expired — try refresh
    console.log('Access token expired, attempting refresh…')

    if (tokenFunctions.isRefreshExpired()) {
      // both tokens dead — nothing we can do server-side
      console.error('Refresh token also expired.')
      throw new SessionExpiredError()
    }

    try {
      const params = new URLSearchParams({
        grant_type:    'refresh_token',
        refresh_token: refresh_token,
        client_id:     client_id,
        client_secret: client_secret,
      })
      const resp = await fetch(TOKEN_ENDPOINT, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    params.toString(),
      })

      if (!resp.ok) {
        const body = await resp.text().catch(() => '')
        console.error(`Token refresh failed: ${resp.status} ${body}`)
        throw new SessionExpiredError()
      }

      const data    = await resp.json()
      working_token = data.access_token

      // update stored tokens if the server returns new ones
      if (data.refresh_token) {
        refresh_token     = data.refresh_token
        refresh_token_exp = Date.now() + (data.refresh_expires_in || 1800) * 1000
      }
      access_token_exp = Date.now() + (data.expires_in || 300) * 1000
      access_token     = working_token

      console.log('Token refreshed successfully.')
      return working_token

    } catch (err) {
      if (err instanceof SessionExpiredError) throw err
      console.error('Unexpected error during token refresh:', err.message)
      throw new SessionExpiredError()
    }
  },
}

// ── background token refresh ──────────────────────────────────────────────────
let _refreshTimer = null

function scheduleRefresh(expiresIn) {
  if (_refreshTimer) clearTimeout(_refreshTimer)

  // refresh 60 seconds before expiry, minimum 5 seconds from now
  const delay = Math.max((expiresIn - 60) * 1000, 5000)

  _refreshTimer = setTimeout(async () => {
    if (tokenFunctions.isRefreshExpired()) {
      // refresh token is dead — nothing we can do silently,
      // the user will need to log in again next time they try to submit
      console.log('[tokenManager] Refresh token expired — silent renewal not possible.')
      return
    }

    try {
      console.log('[tokenManager] Background token refresh starting…')
      await tokenFunctions.getWorkingToken()

      // reschedule using the new expiry
      const newExpiresIn = Math.floor((access_token_exp - Date.now()) / 1000)
      scheduleRefresh(newExpiresIn)
      console.log(`[tokenManager] Background refresh succeeded. Next refresh in ${newExpiresIn - 60}s`)
    } catch (err) {
      console.error('[tokenManager] Background refresh failed:', err.message)
      // retry in 30 seconds
      _refreshTimer = setTimeout(() => scheduleRefresh(60), 30000)
    }
  }, delay)
}

// call this from setAccessToken so the timer starts as soon as the user logs in
const _originalSetAccessToken = tokenFunctions.setAccessToken.bind(tokenFunctions)
tokenFunctions.setAccessToken = function(clientId, clientSecret, newAccessToken, expiresIn, refresh, refresh_exp) {
  _originalSetAccessToken(clientId, clientSecret, newAccessToken, expiresIn, refresh, refresh_exp)
  scheduleRefresh(expiresIn)
  console.log(`[tokenManager] Token set. Background refresh scheduled in ${expiresIn - 60}s`)
}

export default tokenFunctions