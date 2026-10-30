const LOGGED_OUT_KEY = 'mw_logged_out'
const USER_INFO_URL = import.meta.env.VITE_APP_USER_INFO_URL
const userMap = {
    username: 'http://schema.org/alternateName',
    fullname: 'http://schema.org/name',
    email: 'http://schema.org/email'
}

const authFunctions = {

getTicket: async function getTicket () {
    const ticketNumber = new URLSearchParams(window.location.search).get('TicketNumber')
    return ticketNumber
},

zammad: async function zammad (ticketNumber) {
    try {
        //const ticketNumber = new URLSearchParams(window.location.search).get('TicketNumber')
        console.log('zammad auth functions got ticket:', ticketNumber)
        const response = await fetch(`/api/zammad/zammadinfo?TicketNumber=${ticketNumber}`)
        if (!response.ok) {
            throw new Error(`Failed to fetch zammad info from express server: ${response.status}`)
        }
        const data = await response.json()
        const nettskjemaId = data.submissionId
        const datasetVersionId = data.datasetVersionId
        return [ nettskjemaId, datasetVersionId ]
    } catch (error) {
        throw new Error ('Error occurred while fetching zammad ticket info:', error.message)
    }
},

nettskjema: async function nettskjema (nettskjemaId) {
    try {
        const response = await fetch(`/api/zammad/nettskjema?NettskjemaId=${nettskjemaId}`)
        if (!response.ok) {
            throw new Error(`Failed to fetch nettskjema info from my express: ${response.status}`)
        }
        const data = await response.json()
        return data
    } catch (error) {
        throw new Error ('Error occurred while fetching nettskjema info from backend:', error.message)
    }
},

// silent === true: ask the EBRAINS login to answer without showing anything (works when the person is already logged in
// to EBRAINS in this browser). Any other argument (for example the click event of a button) is a normal login.
login: async function login (silent) {
    if (silent !== true) { try { sessionStorage.removeItem(LOGGED_OUT_KEY) } catch { /* ignore */ } }
    const urlParams = new URLSearchParams(window.location.search)
    if (silent === true) urlParams.set('silent', '1')
    let url = 'api/auth/loginurl'  
    url += '?' + urlParams.toString()
    try {
        const urlResponse = await fetch(url)
        if (!urlResponse.ok) {
            throw new Error(`Failed to fetch IAM link from backend: ${urlResponse.status}`)}
        window.location.href = await urlResponse.text()
    } catch (error) {
        throw new Error ('Error occurred while logging in:', error.message)}
},

// Is this browser already logged in to the wizard (server session)? Then no trip to the EBRAINS login is needed.
me: async function me () {
    try {
        const r = await fetch('api/auth/me', { credentials: 'same-origin', cache: 'no-store' })
        if (!r.ok) return null
        return await r.json()
    } catch { return null }
},

// "Log-out" logs the person out of the WIZARD (server session) and remembers it in this tab, so the wizard does not log
// them straight in again. The EBRAINS login of the browser is not touched (other EBRAINS sites, such as the support
// site, would then have to take part in the logout, and a problem there stops the page on an error).
logout: async function logout() {
    try {
        try { sessionStorage.setItem(LOGGED_OUT_KEY, '1') } catch { /* ignore */ }
        await fetch('api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {})
        // back to the wizard page of the ticket, which now shows the login dialog
        const ticket = new URLSearchParams(window.location.search).get('TicketNumber')
        const first = (() => { try { return new URL(localStorage.getItem('wizard_link_ticket') || '').searchParams.get('TicketNumber') } catch { return null } })()
        const t = ticket || first
        window.location.href = window.location.pathname + (t ? `?TicketNumber=${encodeURIComponent(t)}` : '')
    } catch (error) {console.error('Error occurred while logging out:', error.message)}
},

// Log out of EBRAINS as well (all EBRAINS sites in this browser), for example on a shared computer.
logoutEbrains: async function logoutEbrains() {
    try {
        try { sessionStorage.setItem(LOGGED_OUT_KEY, '1') } catch { /* ignore */ }
        const ticket = new URLSearchParams(window.location.search).get('TicketNumber')
        const logoutResponse = await fetch('api/auth/logouturl' + (ticket ? `?TicketNumber=${encodeURIComponent(ticket)}` : ''))
        if (!logoutResponse.ok) {
            throw new Error(`Failed to logout. Status: ${logoutResponse.status}`)}
        window.location.href = await logoutResponse.text()
    } catch (error) {console.error('Error occurred while logging out:', error.message)}
},

wasLoggedOut: () => { try { return sessionStorage.getItem(LOGGED_OUT_KEY) === '1' } catch { return false } },
clearLoggedOut: () => { try { sessionStorage.removeItem(LOGGED_OUT_KEY) } catch { /* ignore */ } },

getToken: async function getToken(opts = {}) {
    const { signal } = opts
    const urlParams = new URLSearchParams(window.location.search)
    //console.log('code', urlParams.code)
    let url = 'api/auth/token'
    url += '?' + urlParams.toString()
    try {
      const tokenResponse = await fetch(url, {
        method: "GET",
        signal,
        headers: { "Accept": "text/plain" }
      })
        //removeUrlParams(["code", "iss", "session_state"])
      if (!tokenResponse.ok) {
        throw new Error(`Failed to fetch token and user info from backend: ${tokenResponse.status}`)}
        return tokenResponse.text()
        //return tokenResponse
    } catch (error) {
      console.error('Error occurred while fetching token and user info from backend:', error.message)}
    },

getUserKG: async function getUserKG(token) {
    try {
        const userResponse = await fetch(`${USER_INFO_URL}`, {headers: {authorization: token, 'Content-Type': 'application/json'}})
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
        return userInfo
    } 
        catch (error) { console.error('Error fetching user from backend:', error.message) }
    },
    
  //this route is not used, CORS problems
/*
getUser: async function getUser(token) {
    const url = 'api/auth/user'
    try {
      const userResponse = await fetch(url, {headers: {authorization: token, 'Content-Type': 'application/json'}});
      if (!userResponse.ok) {
        throw new Error(`Failed to get user, status: ${userResponse.status}`)
      }
      const data = await userResponse.json()
      console.log(data)
      return data
    } catch (error) {console.error('Error fetching user from backend:', error.message)
  }
    },
*/

}

export default authFunctions