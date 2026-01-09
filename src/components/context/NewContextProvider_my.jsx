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
    datasetVersionId: null,
    ticketNumber: null,
    nettskjemaId: null,
}
export const AuthContext = createContext(initialState)
export const AuthDispatch = createContext(null)

export default function NewContextProvider({ children }) {

  const [state, dispatch] = useReducer(authReducer, initialState)

  const mountedRef = useRef(false)
  const hasAuthenticatedRef = useRef(false)
  const hasTicketRef = useRef(false)
  const fetchedTicketRef = useRef(false)

  const removeUrlParams = useCallback((params = []) => {
      try {
      const url = new URL(window.location.href)
      params.forEach((p) => url.searchParams.delete(p))
      window.history.replaceState({}, document.title, url.toString())
      } catch (err) {}
  }, [])
    
  useEffect(() => {
    mountedRef.current = true

    const authenticateUser = async () => {
      const url = new URL(window.location.href)
      const hasCode = url.searchParams.has("code")
      const hasError = url.searchParams.has("error")

      //console.log('hasCode:', hasCode, 'hasError:', hasError)

      if (hasError) {
        console.warn("Auth redirect had error:", url.searchParams.get("error"))
        removeUrlParams(["error"])
        setTimeout(() => {if (mountedRef.current) {dispatch({ type: "SHOW_LOGIN_DIALOG" })}}, 3000) 
        return
      }
        
      if (hasCode && !hasAuthenticatedRef.current) {
        //console.log('Processing auth code...')
        try {
          const token = await authFunctions.getToken()
          //console.log('Token received:', !!token)
          if (!mountedRef.current) return
          
          if (token) {
            dispatch({ type: "SET_TOKEN", text: token })
            removeUrlParams(["code", "iss", "session_state"])

            //console.log('About to fetch user with token...')
            const user = await authFunctions.getUserKG(token)
            //console.log('User received:', !!user)
            if (!mountedRef.current) return
            
            if (user) {
              dispatch({ type: "SET_USER", text: user })
              hasAuthenticatedRef.current = true
              console.log('Authentication complete!')
            }
          }
        } catch (err) {
          console.error("Error during token exchange or fetching user:", err)
          removeUrlParams(["code", "iss", "session_state"])
          setTimeout(() => {if (mountedRef.current) {dispatch({ type: "SHOW_LOGIN_DIALOG" })}}, 3000)}
        return
      }

      //console.log('No auth code found, showing login dialog...')
    if (!hasAuthenticatedRef.current) {
      setTimeout(() => {
        if (mountedRef.current) {dispatch({ type: "SHOW_LOGIN_DIALOG" })}
      }, 3000)}
    }

    authenticateUser()

    return () => {
      mountedRef.current = false
    }
  }, [removeUrlParams])
  
  //nettskjema
  useEffect(() => {
    const url = new URL(window.location.href)
    const urlContainsTicket = url.searchParams.has('TicketNumber')
    if (!urlContainsTicket || fetchedTicketRef.current) return
    if (urlContainsTicket) { hasTicketRef.current = true }
    fetchedTicketRef.current = true

    const fetchTicket = async () => {
      if (hasTicketRef.current) {
          try {
            const ticketNumber = await authFunctions.getTicket()
            if (!mountedRef.current) return
            if (ticketNumber) {
              dispatch({ type: 'ticket', text: ticketNumber })
              //console.log('ticket number:', ticketNumber)
              const [nettskjemaId, datasetVersionId] = await authFunctions.zammad(ticketNumber)
              if (!mountedRef.current) return
              //console.log('dataset version id:', datasetVersionId)
              dispatch({ type: 'datasetVersionId', text: datasetVersionId })
              const nettskjemaInfo = await authFunctions.nettskjema(nettskjemaId)
              if (!mountedRef.current) return
              console.log(nettskjemaInfo)
              const skjemaInfo = {
                contactFirstName: nettskjemaInfo.ContactInfo[0],
                contactSurname: nettskjemaInfo.ContactInfo[1],
                contactEmail: nettskjemaInfo.ContactInfo[2],
                custodionaFirstName: nettskjemaInfo.CustodianInfo[0],
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
            }
          } catch (error) {console.error('Error fetching ticket:', error)}}}
    
      fetchTicket()

    }, [removeUrlParams])
  
  return (
    <AuthContext value={state}>
        <AuthDispatch value={dispatch}>
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
      </AuthDispatch>
    </AuthContext>
  )
}

export function authReducer(state, action) {
  switch (action.type) {
    case 'SET_TOKEN':
      return {...state, token: action.text, showLoginDialog: false}
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
    case 'ticket':
      return {...state, ticketNumber: action.text} 
    case 'nettskjemaInfo':
      return {...state, nettskjemaInfo: action.text}  
    case 'datasetVersionId':
      return {...state, datasetVersionId: action.text} 
    default:
      return state
  }
}

export function useAuthContext() {return useContext(AuthContext)}
export function useAuthDispatch() {return useContext(AuthDispatch)}