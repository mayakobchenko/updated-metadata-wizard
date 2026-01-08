//useEffect should perform any async token verification (not during rendering
// ).
//Cancel in-flight requests when effect cleans up (AbortController).
//Ignore stale responses with a requestId guard.
//Avoid dispatching after unmount (mountedRef).

/*Run the auth check inside useEffect (so nothing runs during render).
Use AbortController to cancel fetches in cleanup.
Use a requestId (ref) to ignore stale responses from earlier requests.
Use a mountedRef to avoid dispatch after unmount (defensive).
Provide helper actions (login/logout/refresh) that are safe and update token storage consistently.
*/

/* Replace "/api/auth/verify" with your actual endpoint and adapt header/body as needed.
I exposed login/logout/refresh via AuthDispatch value; call login(token) after a successful OAuth flow or when you obtain a token.
verifyToken uses AbortController + requestId + mountedRef. That combination prevents:
stale responses from overwriting new state,
setting state after unmount,
duplicate simultaneous requests (we abort the previous).
If you prefer a simpler approach when using libraries like React Query / SWR, they handle deduping and cancellation for you and can simplify this provider a lot.
Keep console.log only for debugging; it's safe (not mutating) but will run multiple times under StrictMode.
 */

import { createContext, useReducer, useContext, useEffect, useRef } from 'react'

const initialState = {
    isLoggingButton: false,
    loginAlert: true,    
    token: null, 
    user: null, 
    ticketNumber: null,
    nettskjemaId: null,
    message: "Loading...",
    isAuthenticating: true, 
    status: "idle", // 'idle' | 'checking' | 'authenticated' | 'unauthenticated' | 'error'
    error: null,
    nettskjemaInfo: null,
    datasetVersionId: null
}
export const AuthContext = createContext(initialState)
export const AuthDispatch = createContext(null)

export default function AuthProviderNew({ children }) {
  console.log('AuthProvider is mounted')

  const [state, dispatch] = useReducer(authReducer, initialState)

  const mountedRef = useRef(false)
  const hasAuthenticatedRef = useRef(false)
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)  
  const abortRef = useRef(null)
  const lastRequestId = useRef(0)

  const removeUrlParams = useCallback((params = []) => {
    try {
      const url = new URL(window.location.href)
      params.forEach((p) => url.searchParams.delete(p))
      window.history.replaceState({}, document.title, url.toString())
    } catch (err) {}
  }, [])

  function handleLoginError() {removeUrlParams(['error'])}

  useEffect(() => {
    mountedRef.current = true

    (async () => {
      const url = new URL(window.location.href)
      const hasCode = url.searchParams.has("code")
      const hasError = url.searchParams.has("error")

      if (hasError) {
        console.warn("Auth redirect had error:", url.searchParams.get("error"))
        url.searchParams.delete("error")
        //url.searchParams.delete('error_description')
        window.history.replaceState({}, document.title, url.toString())
        // continue coding here: treat as not logged in
      }

      if (hasCode && !hasAuthenticatedRef.current) {
        hasAuthenticatedRef.current = true
        try {
          const token = await authFunctions.getToken()
          if (!mounted) return
          if (token) {
            dispatch({ type: "SET_TOKEN", token })
            url.searchParams.delete("code")
            url.searchParams.delete("iss")
            //url.searchParams.delete('state')
            url.searchParams.delete("session_state")
            window.history.replaceState({}, document.title, url.toString())
            const user = await authFunctions.getUserKG(token)
            if (!mounted) return
            if (user) {dispatch({ type: "SET_USER", user })}
          }
        } catch (err) {
          console.error("Error during token exchange or fetching user:", err)
          url.searchParams.delete("code")
          url.searchParams.delete("iss")
          url.searchParams.delete("session_state")
          window.history.replaceState({}, document.title, url.toString())
        }
        return
      }
      
      try {   
        // First: silent refresh attempt using backend refresh endpoint
        // If this succeeds we are authenticated without redirecting.
        // If silent refresh did not authenticate, proceed with normal OIDC redirect logic
        if (!hasAuthenticatedRef.current) {
          // Not returned from IAM; start authenticate (likely redirects)
          try {
            await authFunctions.authenticate()
            // authenticate typically redirects; if it returns, nothing else to do here
            return
          } catch (authErr) {
            console.error("authFunctions.authenticate error:", authErr)
            // continue — maybe we are in a special flow where authenticate cannot redirect
          }
        }

        // If we have an error param, clean it up and stop
        if (window.location.href.includes("error=")) {
          handleLoginError();
          dispatch({ type: "CHECK_FAIL", error: "Login error present in URL" });
          return;
        }

        // If we have an authorization code, exchange it for a token then fetch user info
        if (window.location.href.includes("code=")) {
          dispatch({ type: "CHECK_START" });
          try {
            const token = await authFunctions.getToken(); // expects Promise<string>
            if (!mountedRef.current) return;
            if (!token) {
              dispatch({ type: "CHECK_FAIL", error: "No token returned from getToken" });
              return;
            }
            handleTokenReceived(token);

            // optional: fetch user using token (your authFunctions.getUserKG)
            try {
              const user = await authFunctions.getUserKG(token);
              if (!mountedRef.current) return;
              if (user) {
                dispatch({ type: "SET_USER", user });
              }
              // final success
              dispatch({ type: "CHECK_SUCCESS", user, token });
            } catch (userErr) {
              if (!mountedRef.current) return;
              console.error("getUserKG error:", userErr);
              // We still have a token; consider user optional
              dispatch({ type: "CHECK_SUCCESS", token });
            }
          } catch (tokenErr) {
            if (!mountedRef.current) return;
            console.error("getToken error:", tokenErr);
            dispatch({ type: "CHECK_FAIL", error: tokenErr.message || String(tokenErr) });
          }
        } else {
          // No code in URL and we had hasAuthenticatedRef true — fallback unauthenticated
          // Or you may choose to dispatch unauthenticated here so UI can render login button
          dispatch({ type: "CHECK_FAIL", error: null });
        }
      } catch (err) {
        if (!mountedRef.current) return;
        console.error("AuthProvider mount flow error:", err)
        dispatch({ type: "ERROR", error: err.message || String(err) })
      }
    })()

    return () => {mountedRef.current = false}
  }, [removeUrlParams])
  
  return (
    <AuthContext value={state}>
      <AuthDispatch value={dispatch}>
          {children}
      </AuthDispatch>
    </AuthContext>
  )
}

export function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        isLoggingButton: true
      }
    case 'LOGOUT':
      return {
        ...state,
        isLoggingButton: false, 
        user: null,
        token: null,
        message: "Loging out...",
        loginAlert: true,
        isAuthenticating: false
      }
    case 'gotToken':
        return {
            ...state, 
            token: action.text,
            message: "Retrieving user info..."
        }
    case 'code':
        return {
            ...state, 
            message: "Authenticating...",
            loginAlert: false
    }
    case 'user':
    return {
        ...state, 
        user: action.text,
        isAuthenticating: false,
        loginAlert: false
    }     
    case 'ticket':
      return {
          ...state, 
          ticketNumber: action.text
      } 
      case 'nettskjemaInfo':
        return {
            ...state, 
            nettskjemaInfo: action.text
      }  
      case 'datasetVersionId':
        return {
            ...state, 
            datasetVersionId: action.text
        } 
    default:
      return state
  }
}

export function useAuthContext() {
    return useContext(AuthContext)
  }
  export function useAuthDispatch() {
    return useContext(AuthDispatch)
  }