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
  nettskjemaLoading: false,
  nettskjemaError: null,
  userError: null,
}
export const AuthContext = createContext(initialState)
export const AuthDispatch = createContext(null)

export default function NewContextProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  const mountedRef = useRef(false)
  const hasAuthenticatedRef = useRef(false)
  const fetchedTicketRef = useRef(false)

  const removeUrlParams = useCallback((params = []) => {
    try {
      const url = new URL(window.location.href)
      params.forEach((p) => url.searchParams.delete(p))
      window.history.replaceState({}, document.title, url.toString())
    } catch (err) { /* ignore */ }
  }, [])

  // Helper: retry with backoff
  const retryWithBackoff = async (fn, { attempts = 3, delay = 500 } = {}) => {
    let attempt = 0
    let lastErr
    while (attempt < attempts && mountedRef.current) {
      try {
        return await fn()
      } catch (err) {
        lastErr = err
        attempt += 1
        const wait = delay * Math.pow(2, attempt - 1)
        await new Promise((res) => setTimeout(res, wait))
      }
    }
    throw lastErr
  }

  // Authentication effect (token exchange + user fetch)
  useEffect(() => {
    mountedRef.current = true

    const authenticateUser = async () => {
      const url = new URL(window.location.href)
      const hasCode = url.searchParams.has("code")
      const hasError = url.searchParams.has("error")

      if (hasError) {
        console.warn("Auth redirect had error:", url.searchParams.get("error"))
        removeUrlParams(["error"])
        setTimeout(() => { if (mountedRef.current) dispatch({ type: "SHOW_LOGIN_DIALOG" }) }, 3000)
        return
      }

      if (hasCode && !hasAuthenticatedRef.current) {
        try {
          // get token (might perform network call)
          const token = await retryWithBackoff(() => authFunctions.getToken(), { attempts: 3, delay: 300 })
          if (!mountedRef.current) return

          if (token) {
            dispatch({ type: "SET_TOKEN", text: token })
            removeUrlParams(["code", "iss", "session_state"])

            // fetch user (also with retry)
            const user = await retryWithBackoff(() => authFunctions.getUserKG(token), { attempts: 3, delay: 300 })
            if (!mountedRef.current) return

            if (user) {
              dispatch({ type: "SET_USER", text: user })
              hasAuthenticatedRef.current = true
              console.log('Authentication complete!')
            }
          }
        } catch (err) {
          console.error("Error during token/user fetch:", err)
          dispatch({ type: "SET_USER_ERROR", text: String(err) })
          removeUrlParams(["code", "iss", "session_state"])
          setTimeout(() => { if (mountedRef.current) dispatch({ type: "SHOW_LOGIN_DIALOG" }) }, 3000)
        }
        return
      }

      // No code present — show login dialog after short delay if not authenticated
      if (!hasAuthenticatedRef.current) {
        setTimeout(() => { if (mountedRef.current) dispatch({ type: "SHOW_LOGIN_DIALOG" }) }, 3000)
      }
    }

    authenticateUser()
    return () => { mountedRef.current = false }
  }, [removeUrlParams])

  // Nettskjema effect (fetch once if TicketNumber present)
  useEffect(() => {
    const url = new URL(window.location.href)
    const urlContainsTicket = url.searchParams.has('TicketNumber')
    if (!urlContainsTicket || fetchedTicketRef.current) return
    fetchedTicketRef.current = true

    let aborted = false
    const controller = new AbortController()
    dispatch({ type: 'NETTSKJEMA_FETCH_START' })

    const fetchTicketAndNettskjema = async () => {
      try {
        // If you need to wait for authentication to complete before fetching,
        // uncomment the block below. Otherwise it will run immediately.
        //
        // await waitForAuth(); // implement wait logic if needed

        const ticketNumber = await retryWithBackoff(() => authFunctions.getTicket(), { attempts: 3, delay: 300 })
        if (!mountedRef.current || aborted) return

        if (ticketNumber) {
          dispatch({ type: 'ticket', text: ticketNumber })
          // zammad might need auth token internally — ensure authFunctions uses current token from storage or state
          const [nettskjemaId, datasetVersionId] = await retryWithBackoff(
            () => authFunctions.zammad(ticketNumber),
            { attempts: 3, delay: 300 }
          )
          if (!mountedRef.current || aborted) return
          dispatch({ type: 'datasetVersionId', text: datasetVersionId })

          const nettskjemaInfo = await retryWithBackoff(
            () => authFunctions.nettskjema(nettskjemaId, { signal: controller.signal }),
            { attempts: 3, delay: 300 }
          )
          if (!mountedRef.current || aborted) return

          const skjemaInfo = {
            contactFirstName: nettskjemaInfo.ContactInfo?.[0] ?? null,
            contactSurname: nettskjemaInfo.ContactInfo?.[1] ?? null,
            contactEmail: nettskjemaInfo.ContactInfo?.[2] ?? null,
            custodionaFirstName: nettskjemaInfo.CustodianInfo?.[0] ?? null,
            custodianSurname: nettskjemaInfo.CustodianInfo?.[1] ?? null,
            custodianEmail: nettskjemaInfo.CustodianInfo?.[2] ?? null,
            custodianORCID: nettskjemaInfo.CustodianInfo?.[3] ?? null,
            custodianInstitution: nettskjemaInfo.CustodianInfo?.[4] ?? null,
            GroupLeaderName: nettskjemaInfo.GroupLeader?.[0] ?? null,
            GroupLeaderOrcid: nettskjemaInfo.GroupLeader?.[1] ?? null,
            dataTitle: nettskjemaInfo.DataInfo?.[0] ?? null,
            briefSummary: nettskjemaInfo.DataInfo?.[1] ?? null,
            embargo: nettskjemaInfo.DataInfo?.[2] ?? null,
            optionsData: nettskjemaInfo.DataInfo?.[3] ?? null,
            embargoReview: nettskjemaInfo.DataInfo?.[4] ?? null,
            submitJournalName: nettskjemaInfo.DataInfo?.[5] ?? null,
            Data2UrlDoiRepo: nettskjemaInfo.Data2Info?.[0] ?? null,
            Data2DoiJournal: nettskjemaInfo.Data2Info?.[1] ?? null
          }
          dispatch({ type: 'nettskjemaInfo', text: skjemaInfo })
          dispatch({ type: 'NETTSKJEMA_FETCH_SUCCESS' })
          // Optionally remove TicketNumber from URL:
          // removeUrlParams(['TicketNumber'])
        } else {
          throw new Error('Ticket not found')
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          // cancelled — ignore
          return
        }
        console.error('Error fetching ticket/nettskjema:', err)
        dispatch({ type: 'NETTSKJEMA_FETCH_ERROR', text: String(err) })
      }
    }

    fetchTicketAndNettskjema()

    return () => {
      aborted = true
      controller.abort()
    }
  }, [removeUrlParams])

  // Correct use of Providers
  return (
    <AuthContext value={state}>
      <AuthDispatch value={dispatch}>
        {state.showLoginDialog && (
          <Dialog open>
            <DialogTitle>Welcome to the Ebrains Metadata Wizard</DialogTitle>
            <DialogContent>
              <Typography>Please login with your Ebrains account to continue.</Typography>
              {state.userError && <Typography color="error">{state.userError}</Typography>}
            </DialogContent>
            <DialogActions>
              <Button variant="contained" onClick={authFunctions.login}>Login</Button>
            </DialogActions>
          </Dialog>
        )}
        {children}
      </AuthDispatch>
    </AuthContext>
  )
}

export function authReducer(state, action) {
  switch (action.type) {
    case 'SET_TOKEN':
      return { ...state, token: action.text, showLoginDialog: false }
    case 'SET_USER':
      return { ...state, user: action.text, showLoginDialog: false, isAuthenticating: false }
    case 'SET_USER_ERROR':
      return { ...state, userError: action.text, isAuthenticating: false }
    case 'SHOW_LOGIN_DIALOG':
      return { ...state, showLoginDialog: true }
    case 'HIDE_LOGIN_DIALOG':
      return { ...state, showLoginDialog: false }
    case 'LOGOUT':
      return { ...state, token: null, user: null, showLoginDialog: false }
    case 'LOGIN':
      return { ...state, showLoginDialog: true }
    case 'ticket':
      return { ...state, ticketNumber: action.text }
    case 'nettskjemaInfo':
      return { ...state, nettskjemaInfo: action.text }
    case 'datasetVersionId':
      return { ...state, datasetVersionId: action.text }
    case 'NETTSKJEMA_FETCH_START':
      return { ...state, nettskjemaLoading: true, nettskjemaError: null }
    case 'NETTSKJEMA_FETCH_SUCCESS':
      return { ...state, nettskjemaLoading: false, nettskjemaError: null }
    case 'NETTSKJEMA_FETCH_ERROR':
      return { ...state, nettskjemaLoading: false, nettskjemaError: action.text }
    default:
      return state
  }
}

export function useAuthContext() { return useContext(AuthContext) }
export function useAuthDispatch() { return useContext(AuthDispatch) }
