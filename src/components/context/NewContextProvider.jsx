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
}
export const AuthContext = createContext(initialState)
export const AuthDispatch = createContext(null)

export default function NewContextProvider({ children }) {
  console.log('app is mounted')
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
  
  useEffect(() => {
    mountedRef.current = true
    console.log('mounted:', mountedRef.current)
    const controller = new AbortController()
    const signal = controller.signal
    const url = new URL(window.location.href)

    async function doAuthThenTicket() {
      try {
        const authenticated = await (async () => {
          const hasCode = url.searchParams.has("code")
          const hasError = url.searchParams.has("error")
          console.log('hasCode:', hasCode, 'hasError:', hasError)
          if (hasError) {
              console.log("Auth redirect had error:", url.searchParams.get("error"))
              removeUrlParams(["error"])
              setTimeout(() => { if (mountedRef.current) { dispatch({ type: "SHOW_LOGIN_DIALOG" }) } }, 3000)
              return false
          }
          if (hasCode && !hasAuthenticatedRef.current) {
              console.log('get token function')
              const user = await authFunctions.getToken({ signal })
              if (!mountedRef.current) return false
              removeUrlParams(["code", "iss", "session_state"])
              /*if (!user) {
                  setTimeout(() => { if (mountedRef.current) dispatch({ type: "SHOW_LOGIN_DIALOG" }) }, 3000)
                  return false
              }*/
              const trimmed = user.replace(/^'|'\s*$/g, '')
              const json_user = JSON.parse(trimmed)
              //console.log('fetched user info', json_user)
              //console.log('user info', json_user.user)
              //console.log('ticket:', json_user.ticket)
              dispatch({ type: "SET_USER", text: json_user.user })
              hasAuthenticatedRef.current = true
              hasTicket.current = json_user.ticket
              console.log('Authentication complete!')
            return true
          }
          if (!hasAuthenticatedRef.current) {
              console.log('dispatch show login dialog is set')
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
        const [nettskjemaId] = await authFunctions.zammad(ticketNumber)
        const nettskjemaInfo = await authFunctions.nettskjema(nettskjemaId)
        console.log(nettskjemaInfo)
        const skjemaInfo = {
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
                <DialogTitle>Welcome to the Ebrains Metadata Wizard</DialogTitle>
                <DialogContent>
                    <Typography>Please login with your Ebrains account to continue.</Typography>
                </DialogContent>
                <DialogActions>
                    <Button variant="contained" onClick={authFunctions.login}>Login</Button>
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
      return {...state, user: action.text, showLoginDialog: false, isAuthenticating: false}
    case "SHOW_LOGIN_DIALOG":
      return { ...state, showLoginDialog: true }
    case "HIDE_LOGIN_DIALOG":
      return { ...state, showLoginDialog: false }
    case 'LOGOUT':
        return { ...state, token: null, user: null, showLoginDialog: false }  
    case 'LOGIN':
      return {...state, showLoginDialog: true} 
    case 'nettskjemaInfo':
      return {...state, nettskjemaInfo: action.text}  
    default:
      return state
  }
}

export function useAuthContext() {return useContext(AuthContext)}
export function useAuthDispatch() { return useContext(AuthDispatch) }

//https://127.0.0.1:8080/?TicketNumber=4826029