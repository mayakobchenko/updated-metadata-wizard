// Per-login storage of the user's OWN EBRAINS access token (server side only,
// in memory, never sent to the browser). The browser only gets an opaque,
// HttpOnly session cookie. Used to call data-proxy as the logged-in user —
// unlike tokenManager.js, which holds one shared token for background KG work.
import crypto from 'crypto'

const TOKEN_ENDPOINT = 'https://iam.ebrains.eu/auth/realms/hbp/protocol/openid-connect/token'
const COOKIE = 'mw_sid'
const MAX_AGE_MS = 12 * 60 * 60 * 1000
const sessions = new Map()

function readCookie(req, name) {
  const raw = req.headers.cookie || ''
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return v.join('=')
  }
  return null
}

export function createUserSession(req, res, { access_token, expires_in, refresh_token, refresh_expires_in }) {
  // drop expired sessions opportunistically
  const now = Date.now()
  for (const [id, s] of sessions) if (s.sessionExp < now) sessions.delete(id)

  const sid = crypto.randomBytes(32).toString('hex')
  sessions.set(sid, {
    access_token,
    exp: now + (expires_in || 300) * 1000,
    refresh_token,
    refreshExp: refresh_token ? now + (refresh_expires_in || 1800) * 1000 : 0,
    sessionExp: now + MAX_AGE_MS,
  })
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https'
  res.append('Set-Cookie',
    `${COOKIE}=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_MS / 1000}${secure ? '; Secure' : ''}`)
}

// Returns a valid access token for the logged-in user, or null.
// force: renew the token now even if it is still valid. Using the refresh token is what keeps the EBRAINS login
// alive (it expires after about 30 minutes WITHOUT use), so the keep-alive of the page asks for this.
export async function getUserAccessToken(req, { force = false } = {}) {
  const sid = readCookie(req, COOKIE)
  const s = sid && sessions.get(sid)
  if (!s || s.sessionExp < Date.now()) return null
  if (!force && Date.now() < s.exp - 15000) return s.access_token
  if (!s.refresh_token || Date.now() >= s.refreshExp) { sessions.delete(sid); return null }
  if (s.renewing) return s.renewing   // two requests at once must not both use the same refresh token
  s.renewing = renew(sid, s).finally(() => { s.renewing = null })
  return s.renewing
}

async function renew(sid, s) {
  try {
    const r = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token', refresh_token: s.refresh_token,
        client_id: process.env.WIZARD_OIDC_CLIENT_ID, client_secret: process.env.WIZARD_OIDC_CLIENT_SECRET,
      }).toString(),
    })
    if (!r.ok) { sessions.delete(sid); return null }
    const t = await r.json()
    s.access_token = t.access_token
    s.exp = Date.now() + (t.expires_in || 300) * 1000
    if (t.refresh_token) { s.refresh_token = t.refresh_token; s.refreshExp = Date.now() + (t.refresh_expires_in || 1800) * 1000 }
    return s.access_token
  } catch { return null }
}
