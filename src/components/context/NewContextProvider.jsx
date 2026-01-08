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

  const removeUrlParams = useCallback((params = []) => {
      try {
      const url = new URL(window.location.href)
      params.forEach((p) => url.searchParams.delete(p))
      window.history.replaceState({}, document.title, url.toString())
      } catch (err) {}
  }, [])
    
  useEffect(() => {
    mountedRef.current = true

    console.log('use effect auth provider')
    const authenticateUser = async () => {
      const url = new URL(window.location.href)
      const hasCode = url.searchParams.has("code")
      const hasError = url.searchParams.has("error")

      console.log('hasCode:', hasCode, 'hasError:', hasError)

      if (hasError) {
        console.warn("Auth redirect had error:", url.searchParams.get("error"))
        removeUrlParams(["error"])
        setTimeout(() => {if (mountedRef.current) {dispatch({ type: "SHOW_LOGIN_DIALOG" })}}, 3000) 
        return
      }
        
      if (hasCode && !hasAuthenticatedRef.current) {
        console.log('Processing auth code...')
        try {
          const token = await authFunctions.getToken()
          console.log('Token received:', !!token)
          if (!mountedRef.current) return
          
          if (token) {
            dispatch({ type: "SET_TOKEN", text: token })
            removeUrlParams(["code", "iss", "session_state"])

            console.log('About to fetch user with token...')
            const user = await authFunctions.getUserKG(token)
            console.log('User received:', !!user)
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

      console.log('No auth code found, showing login dialog...')
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