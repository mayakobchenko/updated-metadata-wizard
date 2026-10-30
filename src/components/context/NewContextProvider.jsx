import { createContext, useReducer, useContext, useEffect, useRef, useCallback } from 'react'
import { Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material"
import authFunctions from "./authenticate"

const initialState = {   
  token: null, 
  user: null, 
  message: "Loading...",
  isAuthenticating: true,
  showLoginDialog: false,
  nettskjemaInfo: null,
  reloadWizard: false,
  datasetVersionId: null,
  ticketNumber: null,
}
export const AuthContext = createContext(initialState)
export const AuthDispatch = createContext(null)
const WIZARD_LINK = 'wizard_link_ticket'
// remembers (in this tab only) that a silent login check was started, and for which ticket
const SILENT_KEY = 'mw_silent_login'
const readSilent = () => { try { return JSON.parse(sessionStorage.getItem(SILENT_KEY) || 'null') } catch { return null } }
const writeSilent = (ticket) => { try { sessionStorage.setItem(SILENT_KEY, JSON.stringify({ t: Date.now(), ticket: ticket || '' })) } catch { /* ignore */ } }
const clearSilent = () => { try { sessionStorage.removeItem(SILENT_KEY) } catch { /* ignore */ } }

export default function NewContextProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  const mountedRef = useRef(false)
  const hasAuthenticatedRef = useRef(false)
  const hasTicket = useRef(null)

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
              if (silentTry?.ticket && !url.searchParams.get("TicketNumber")) {
                  const u = new URL(window.location.origin + window.location.pathname)
                  u.searchParams.set("TicketNumber", silentTry.ticket)
                  window.history.replaceState({}, document.title, u.toString())
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
              const ticketInUrl = url.searchParams.get("TicketNumber")
              // 1. already logged in to the wizard (server session)? Then simply continue, no trip to EBRAINS.
              const me = await authFunctions.me()
              if (!mountedRef.current) return false
              if (me?.active && me.user) {
                  dispatch({ type: "SET_USER", text: me.user })
                  hasAuthenticatedRef.current = true
                  hasTicket.current = ticketInUrl
                  if (ticketInUrl) dispatch({ type: "SET_TICKET", text: ticketInUrl })
                  console.log('Continued with the existing login.')
                  return true
              }
              // 2. logged in to EBRAINS in this browser? Ask the EBRAINS login silently; it answers without showing anything.
              //    Once per minute at most, so a problem can never turn into a redirect loop.
              const earlier = readSilent()
              if (!earlier || Date.now() - earlier.t > 60000) {
                  writeSilent(ticketInUrl)
                  await authFunctions.login(true)
                  return false
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
        if (!ticketNumber) return
        if (!mountedRef.current) return

        // datasetVersionId comes from Zammad, not Nettskjema — store it as
        // soon as we have it, independent of whether the Nettskjema fetch
        // below (which only pre-fills other fields like contact/custodian
        // info) succeeds. Previously this dispatch sat AFTER the Nettskjema
        // call, so when Nettskjema was down, its thrown error skipped this
        // dispatch entirely (caught by the outer try/catch further down) —
        // even though the ID had already been fetched successfully from
        // Zammad on the line above. That's why it appeared to "get lost"
        // whenever Nettskjema had an outage.
        const [nettskjemaId, datasetVersionId] = await authFunctions.zammad(ticketNumber)
        dispatch({ type: 'dsvId', text: datasetVersionId })

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
                  <Button variant="contained" onClick={authFunctions.login}>Login</Button>
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
    case 'SET_TICKET':
      return { ...state, ticketNumber: action.text } 
    default:
      return state
  }
}

export function useAuthContext() {return useContext(AuthContext)}
export function useAuthDispatch() { return useContext(AuthDispatch) }
