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
  reloadWizard: false
}
export const AuthContext = createContext(initialState)
export const AuthDispatch = createContext(null)
const WIZARD_LINK = 'wizard_link_ticket'

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
              console.log("Auth redirect had error:", url.searchParams.get("error"))
              removeUrlParams(["error"])
              setTimeout(() => { if (mountedRef.current) { dispatch({ type: "SHOW_LOGIN_DIALOG" }) } }, 3000)
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
            //const trimmed = user.replace(/^'|'\s*$/g, '')
            //const json_user = JSON.parse(trimmed)
            //console.log('fetched user info', json_user)
            //console.log('user info', json_user.user)
            //console.log('ticket:', json_user.ticket)
            console.log('response from user fetch:', user_response)
            console.log('response parsed:', JSON.parse(user_response))
            const resp_data = JSON.parse(user_response)
              if (resp_data.success) {
                dispatch({ type: "SET_USER", text: resp_data.user })
                hasAuthenticatedRef.current = true
              } else {
                console.log(resp_data.message)
                dispatch({ type: "RELOAD_WIZARD" })
                }
              //dispatch({ type: "SET_USER", text: json_user.user })
              //hasAuthenticatedRef.current = true
              hasTicket.current = resp_data.ticket
              console.log('Authentication complete!')
            return true
          }
          if (!hasAuthenticatedRef.current) {
                setTimeout(() => {if (mountedRef.current) {dispatch({ type: "SHOW_LOGIN_DIALOG" })}
                }, 3000)
              return false
          }
        return false        
    })()

    if (!mountedRef.current) return

    if (authenticated) {
      await (async function fetchTicket() {
        const ticketNumber = hasTicket.current
        //const urlContainsTicket = url.searchParams.has('TicketNumber')
        if (!ticketNumber) return
        //const ticketNumber = await authFunctions.getTicket({ signal })
        if (!mountedRef.current) return
        const [nettskjemaId, datasetVersionId] = await authFunctions.zammad(ticketNumber)
        const nettskjemaInfo = await authFunctions.nettskjema(nettskjemaId)
        console.log('context cosloe log dataset version id', datasetVersionId)
        const skjemaInfo = {
            datasetVersionId: datasetVersionId,
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
            embargoReview: nettskjemaInfo.DataInfo[4],
            submitJournalName: nettskjemaInfo.DataInfo[5],
            Data2UrlDoiRepo: nettskjemaInfo.Data2Info[0],
            Data2DoiJournal: nettskjemaInfo.Data2Info[1]
        }
        dispatch({ type: 'nettskjemaInfo', text: skjemaInfo })
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
    }, [removeUrlParams])  //needed dispatch here? 
  
  
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
      return {...state, nettskjemaInfo: action.text}  
    default:
      return state
  }
}

export function useAuthContext() {return useContext(AuthContext)}
export function useAuthDispatch() { return useContext(AuthDispatch) }

//https://127.0.0.1:8080/?TicketNumber=4826029