import { createContext, useReducer, useContext, useEffect, useRef, useCallback } from 'react'
import { Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material"
import authFunctions from "./authenticate"
import { readWizardParams, buildWizardSearch, restoreWizardUrl } from "../wizardUrl.js"

const initialState = {   
  token: null, 
  user: null, 
  message: "Loading...",
  isAuthenticating: true,
  showLoginDialog: false,
  nettskjemaInfo: null,
  reloadWizard: false,
  datasetVersionId: null,
  urlDatasetVersionId: null,   // the DatasetVersionUUID of the link, when it had one
  urlTicketUnavailable: false, // the ticket could not be read (Zammad down); the dataset of the link is used
  urlDatasetIgnored: false,    // the link named a dataset that the ticket does not cover
  datasetCandidates: [],   // every dataset named in the ticket: [{ id, title }]
  ticketNumber: null,
}
export const AuthContext = createContext(initialState)
export const AuthDispatch = createContext(null)
const WIZARD_LINK = 'wizard_link_ticket'
// remembers (in this tab only) that a silent login check was started, and for which ticket
const SILENT_KEY = 'mw_silent_login'
const readSilent = () => { try { return JSON.parse(sessionStorage.getItem(SILENT_KEY) || 'null') } catch { return null } }
const writeSilent = (ticket, dsv) => { try { sessionStorage.setItem(SILENT_KEY, JSON.stringify({ t: Date.now(), ticket: ticket || '', dsv: dsv || '' })) } catch { /* ignore */ } }
const clearSilent = () => { try { sessionStorage.removeItem(SILENT_KEY) } catch { /* ignore */ } }

export default function NewContextProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  const mountedRef = useRef(false)
  const hasAuthenticatedRef = useRef(false)
  const hasTicket = useRef(null)
  const hasDsv = useRef(null)      // DatasetVersionUUID of the link

  const removeUrlParams = useCallback((params = []) => {
    try {
    const url = new URL(window.location.href)
    params.forEach((p) => url.searchParams.delete(p))
    window.history.replaceState({}, document.title, url.toString())
    } catch (err) {}
  }, [])
  
  function handleReloadClick() {
    if (typeof window === 'undefined') return
    const firstUrl = localStorage.getItem(WIZARD_LINK)
    if (firstUrl) {
      window.location.href = firstUrl
    } else {
      window.location.reload()
    }
  }

  useEffect(() => {
    mountedRef.current = true
    const controller = new AbortController()
    const signal = controller.signal
    const url = new URL(window.location.href)

    const storedFirstUrl = localStorage.getItem(WIZARD_LINK)
    if (!storedFirstUrl) {
      localStorage.setItem(WIZARD_LINK, url.toString())
    }

    async function doAuthThenTicket() {
      try {
          const authenticated = await (async () => {
          const hasCode = url.searchParams.has("code")
          const hasError = url.searchParams.has("error")
          //console.log('hasCode:', hasCode, 'hasError:', hasError)
          if (hasError) {
              const why = url.searchParams.get("error")
              console.log("Auth redirect had error:", why)
              // The silent check answered "not logged in to EBRAINS": put the ticket number back (the answer does not
              // carry it) and show the normal login dialog at once.
              const silentTry = readSilent()
              const quiet = ['login_required', 'interaction_required', 'consent_required'].includes(why)
              if ((silentTry?.ticket || silentTry?.dsv) && !readWizardParams(window.location.search).ticket) {
                  window.history.replaceState({}, document.title,
                    window.location.pathname + buildWizardSearch({ ticket: silentTry.ticket, datasetVersionId: silentTry.dsv }))
              } else {
                  removeUrlParams(["error", "error_description", "state", "iss", "session_state"])
              }
              if (mountedRef.current) {
                  if (quiet) dispatch({ type: "SHOW_LOGIN_DIALOG" })
                  else setTimeout(() => { if (mountedRef.current) { dispatch({ type: "SHOW_LOGIN_DIALOG" }) } }, 3000)
              }
              return false
          }
          if (hasCode && !hasAuthenticatedRef.current) {
              //console.log('get token function')
            const user_response = await authFunctions.getToken({ signal })
            //const body = await user_response.json().catch(() => null)
            //console.log('status:', user_response.status)
            //console.log('body:', body)
            if (!mountedRef.current) return false
            removeUrlParams(["code", "iss", "session_state"])
            clearSilent()
            authFunctions.clearLoggedOut()
            //const trimmed = user.replace(/^'|'\s*$/g, '')
            //const json_user = JSON.parse(trimmed)
            //console.log('fetched user info', json_user)
            //console.log('user info', json_user.user)
            //console.log('ticket:', json_user.ticket)
            console.log('response from user fetch:', user_response)
            //console.log('response parsed:', JSON.parse(user_response))
            const resp_data = JSON.parse(user_response)
              if (resp_data.success) {
                dispatch({ type: "SET_USER", text: resp_data.user })
                hasAuthenticatedRef.current = true
                hasTicket.current = resp_data.ticket
                hasDsv.current = resp_data.datasetVersionUUID || null
                dispatch({ type: "SET_TICKET", text: resp_data.ticket })
              } else {
                console.log(resp_data.message)
                dispatch({ type: "RELOAD_WIZARD" })
                }
              //hasTicket.current = resp_data.ticket
              //dispatch({ type: "SET_TICKET", text: resp_data.ticket })
              console.log('Authentication complete!')
            return true
          }
          if (!hasAuthenticatedRef.current) {
              // the person logged out of the wizard in this tab: do not log in again by itself
              if (authFunctions.wasLoggedOut()) {
                  if (mountedRef.current) dispatch({ type: "SHOW_LOGIN_DIALOG" })
                  return false
              }
              const { ticket: ticketInUrl, datasetVersionId: dsvInUrl } = readWizardParams(window.location.search)
              // 1. already logged in to the wizard (server session)? Then simply continue, no trip to EBRAINS.
              const me = await authFunctions.me()
              if (!mountedRef.current) return false
              if (me?.active && me.user) {
                  dispatch({ type: "SET_USER", text: me.user })
                  hasAuthenticatedRef.current = true
                  hasTicket.current = ticketInUrl
                  hasDsv.current = dsvInUrl || null
                  if (ticketInUrl) dispatch({ type: "SET_TICKET", text: ticketInUrl })
                  console.log('Continued with the existing login.')
                  return true
              }
              // 2. logged in to EBRAINS in this browser? Ask the EBRAINS login silently; it answers without showing anything.
              //    Once per minute at most, so a problem can never turn into a redirect loop.
              const earlier = readSilent()
              if (!earlier || Date.now() - earlier.t > 60000) {
                  // the marker is set only when the redirect really starts, so a failed request (for example while
                  // the server restarts after a deployment) does not use up the one silent attempt
                  const redirected = await authFunctions.login(true, () => writeSilent(ticketInUrl, dsvInUrl))
                  if (redirected !== false) return false
              }
              // 3. otherwise the person has to log in: show the dialog
              if (mountedRef.current) dispatch({ type: "SHOW_LOGIN_DIALOG" })
              return false
          }
        return false        
    })()

    if (!mountedRef.current) return

    if (authenticated) {
      await (async function fetchTicket() {
        const ticketNumber = hasTicket.current
        const dsvFromLink = hasDsv.current
        if (!mountedRef.current) return
        // The address bar gets the ticket number and the dataset version back: the login answer replaced them.
        restoreWizardUrl({ ticket: ticketNumber, datasetVersionId: dsvFromLink })
        dispatch({ type: 'urlDsv', text: dsvFromLink })
        if (!ticketNumber) {
          // a link with only a DatasetVersionUUID: no ticket, no Nettskjema; the dataset is the one named in the link
          if (dsvFromLink) {
            dispatch({ type: 'dsvId', text: dsvFromLink })
            dispatch({ type: 'nettskjemaInfo', text: {} })
          }
          return
        }

        // datasetVersionId comes from Zammad, not Nettskjema — store it as
        // soon as we have it, independent of whether the Nettskjema fetch
        // below (which only pre-fills other fields like contact/custodian
        // info) succeeds. Previously this dispatch sat AFTER the Nettskjema
        // call, so when Nettskjema was down, its thrown error skipped this
        // dispatch entirely (caught by the outer try/catch further down) —
        // even though the ID had already been fetched successfully from
        // Zammad on the line above. That's why it appeared to "get lost"
        // whenever Nettskjema had an outage.
        let nettskjemaId, datasetVersionId, datasetCandidates
        try {
          [nettskjemaId, datasetVersionId, datasetCandidates] = await authFunctions.zammad(ticketNumber)
        } catch (zammadErr) {
          if (!dsvFromLink) throw zammadErr
          // Zammad does not answer, but the link names the dataset version: work from the Collab drive and the
          // Knowledge Graph of that dataset version. The ticket number stays (it is shown and kept in the link).
          console.warn('Zammad is not available, using the dataset version of the link:', zammadErr?.message)
          dispatch({ type: 'dsvId', text: dsvFromLink })
          dispatch({ type: 'dsvCandidates', text: [] })
          dispatch({ type: 'nettskjemaInfo', text: { ticketNumber } })
          dispatch({ type: 'urlTicketUnavailable', text: true })
          return
        }
        // A link with both: the dataset of the link decides, if the ticket covers it. A dataset that the ticket does not
        // name never takes over (the submission and the Collab copy would go to a dataset the ticket is not about).
        const sameId = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase()
        const covered = !!dsvFromLink && (sameId(dsvFromLink, datasetVersionId) || (datasetCandidates || []).some(c => sameId(c.id, dsvFromLink)))
        dispatch({ type: 'dsvId', text: covered ? dsvFromLink : datasetVersionId })
        dispatch({ type: 'dsvCandidates', text: datasetCandidates })
        if (dsvFromLink && !covered) dispatch({ type: 'urlDsvIgnored', text: true })

        try {
          const nettskjemaInfo = await authFunctions.nettskjema(nettskjemaId)
          const skjemaInfo = {
              ticketNumber: ticketNumber, 
              contactFirstName: nettskjemaInfo.ContactInfo[0],
              contactSurname: nettskjemaInfo.ContactInfo[1],
              contactEmail: nettskjemaInfo.ContactInfo[2],
              custodionaFirstName: nettskjemaInfo.CustodianInfo[0],  //typo
              custodianSurname: nettskjemaInfo.CustodianInfo[1],
              custodianEmail: nettskjemaInfo.CustodianInfo[2],
              custodianORCID: nettskjemaInfo.CustodianInfo[3],
              custodianInstitution: nettskjemaInfo.CustodianInfo[4],
              GroupLeaderName: nettskjemaInfo.GroupLeader[0],
              GroupLeaderOrcid: nettskjemaInfo.GroupLeader[1],
              dataTitle: nettskjemaInfo.DataInfo[0],
              briefSummary: nettskjemaInfo.DataInfo[1],
              embargo: nettskjemaInfo.DataInfo[2],
              optionsData: nettskjemaInfo.DataInfo[3],
              otherDataType: nettskjemaInfo.DataInfo[4],
              dataStandart: nettskjemaInfo.DataInfo[5],
              otherDataStandart: nettskjemaInfo.DataInfo[6],
              embargoReview: nettskjemaInfo.DataInfo[7],
              submitJournalName: nettskjemaInfo.DataInfo[8],
              Data2UrlDoiRepo: nettskjemaInfo.Data2Info[0],
              Data2DoiJournal: nettskjemaInfo.Data2Info[1]
          }
          dispatch({ type: 'nettskjemaInfo', text: skjemaInfo })
        } catch (nettskjemaErr) {
          // Nettskjema being down should only mean "some fields won't be
          // pre-filled" — not "the wizard is unusable". Still dispatch a
          // minimal skjemaInfo with ticketNumber, since other parts of the
          // wizard (e.g. the Zammad JSON-save safety net) read
          // skjemaInfo?.ticketNumber and need it regardless of Nettskjema.
          console.error('Nettskjema fetch failed — dataset version ID is unaffected, but other fields will not be pre-filled:', nettskjemaErr)
          dispatch({ type: 'nettskjemaInfo', text: { ticketNumber } })
        }
      })()
    }
    } catch (err) {
        if (err.name === "AbortError") return
        console.error(err)
    }
    }
    doAuthThenTicket()

    return () => {
        mountedRef.current = false
        controller.abort()
        }
    }, [removeUrlParams])  
  
  
  return (
    <AuthContext.Provider value={state}>
        <AuthDispatch.Provider value={dispatch}>
          {state.showLoginDialog && (
            <Dialog open>
                <DialogTitle>Welcome to the EBRAINS Metadata Wizard</DialogTitle>
                <DialogContent>
                  <Typography>Please login with your EBRAINS account to continue.</Typography>
                </DialogContent>
                <DialogActions>
                  <Button variant="contained" onClick={() => authFunctions.login()}>Login</Button>
                </DialogActions>
            </Dialog>)}
          {state.reloadWizard && (
            <Dialog open>
                <DialogTitle>There is an error at the EBRAINS IAM service.</DialogTitle>
                <DialogContent>
                  <Typography>Please press reload to try again.</Typography>
                </DialogContent>
                <DialogActions>
                  <Button variant="contained" onClick={handleReloadClick}>Reload</Button>
                </DialogActions>
            </Dialog>)}
          {children}
      </AuthDispatch.Provider>
    </AuthContext.Provider>
  )
}

export function authReducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return {...state, user: action.text, showLoginDialog: false, isAuthenticating: false, reloadWizard: false}
    case "SHOW_LOGIN_DIALOG":
      return { ...state, showLoginDialog: true, reloadWizard: false }
    case "HIDE_LOGIN_DIALOG":
      return { ...state, showLoginDialog: false, reloadWizard: false }
    case "RELOAD_WIZARD":
      return { ...state, reloadWizard: true }
    case 'LOGOUT':
        return { ...state, token: null, user: null, showLoginDialog: false, reloadWizard: false }  
    case 'LOGIN':
      return {...state, showLoginDialog: true, reloadWizard: false} 
    case 'nettskjemaInfo':
      return { ...state, nettskjemaInfo: action.text }  
    case 'dsvId':
      return { ...state, datasetVersionId: action.text } 
    case 'dsvCandidates':
      return { ...state, datasetCandidates: action.text || [] }
    case 'urlDsv':
      return { ...state, urlDatasetVersionId: action.text || null }
    case 'urlTicketUnavailable':
      return { ...state, urlTicketUnavailable: !!action.text }
    case 'urlDsvIgnored':
      return { ...state, urlDatasetIgnored: !!action.text }
    case 'SET_TICKET':
      return { ...state, ticketNumber: action.text } 
    default:
      return state
  }
}

export function useAuthContext() {return useContext(AuthContext)}
export function useAuthDispatch() { return useContext(AuthDispatch) }
