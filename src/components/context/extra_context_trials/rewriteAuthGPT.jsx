import { createContext, useReducer, useContext, useEffect, useRef, useCallback } from "react"

const initialState = {
  isLoggingButton: false,
  loginAlert: true,
  token: null,
  user: null,
  ticketNumber: null,
  nettskjemaId: null,
  message: "Loading...",
  isAuthenticating: true,
  nettskjemaInfo: null,
  datasetVersionId: null,
}

export const AuthContext = createContext(initialState)
export const AuthDispatch = createContext(null)

export default function AuthProvider({ children }) {
  
  console.log("AuthProvider is mounted")
    
  const [state, dispatch] = useReducer(authReducer, initialState)

  const abortRef = useRef(null)
  const lastRequestId = useRef(0)
  const mountedRef = useRef(true)  //if app is mounted

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (abortRef.current) abortRef.current.abort()}
  }, [])

  const verifyToken = useCallback(async (token) => {
    if (!token) {
      dispatch({ type: "CHECK_FAIL", error: null })
      return}
    if (abortRef.current) {abortRef.current.abort()}

    const controller = new AbortController()
    abortRef.current = controller
    const requestId = ++lastRequestId.current

    dispatch({ type: "CHECK_START" })

    try {
      const res = await fetch("/api/auth/verify", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      })

      if (!res.ok) {
        const err = new Error("Not authenticated");
        err.status = res.status;
        throw err;
      }

      const data = await res.json();

      // ignore if aborted, stale, or unmounted
      if (controller.signal.aborted) return;
      if (requestId !== lastRequestId.current) return;
      if (!mountedRef.current) return;

      // update state with user info
      dispatch({ type: "CHECK_SUCCESS", user: data.user, token });
    } catch (err) {
      if (err.name === "AbortError") {
        // aborted, ignore
        return;
      }
      // ignore stale responses
      if (requestId !== lastRequestId.current) return;
      if (!mountedRef.current) return;

      console.error("Auth verify failed:", err);
      dispatch({ type: "CHECK_FAIL", error: err.message || "Auth check failed" });
    } finally {
      // optional: clear abortRef if it points to this controller
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  }, []);

  // Run verification on mount (idempotent: handles StrictMode double-mount via abort & requestId)
  useEffect(() => {
    const token = localStorage.getItem("authToken")
    verifyToken(token)
    // cleanup is handled inside verifyToken by abortRef and in outer unmount effect
  }, [verifyToken])

  // store token and re-verify
  const login = useCallback((token) => {
    localStorage.setItem("authToken", token)
    // increment requestId to ignore prior responses and trigger verification
    lastRequestId.current++
    verifyToken(token)
  }, [verifyToken])

  // clear storage and local state, abort any in-flight checks
  const logout = useCallback(() => {
    localStorage.removeItem("authToken")
    if (abortRef.current) abortRef.current.abort()
    lastRequestId.current++
    dispatch({ type: "LOGOUT" })
  }, [])

  const valueDispatch = {
    dispatch, // expose raw dispatch if needed
    login,
    logout,
    refresh: () => {
      const token = localStorage.getItem("authToken")
      lastRequestId.current++
      verifyToken(token)}}

  return (
    <AuthContext value={state}>
      <AuthDispatch value={valueDispatch}>
        {children}
      </AuthDispatch>
    </AuthContext>
  )
}

export function authReducer(state, action) {
  switch (action.type) {
    case "CHECK_START":
      return {
        ...state,
        isAuthenticating: true,
        message: "Checking token...",
        loginAlert: false
        }
    case "CHECK_SUCCESS":
      return {
        ...state,
        isAuthenticating: false,
        user: action.user ?? null,
        token: action.token ?? state.token,
        message: "Authenticated",
        loginAlert: false,
      };
    case "CHECK_FAIL":
      return {
        ...state,
        isAuthenticating: false,
        user: null,
        token: null,
        message: action.error ? String(action.error) : "Unauthenticated",
        loginAlert: true,
      };
    case "LOGIN":
      return {
        ...state,
        isLoggingButton: true,
      };
    case "LOGOUT":
      return {
        ...state,
        isLoggingButton: false,
        user: null,
        token: null,
        message: "Logging out...",
        loginAlert: true,
        isAuthenticating: false,
      };
    case "gotToken":
      return {
        ...state,
        token: action.text,
        message: "Retrieving user info...",
      };
    case "code":
      return {
        ...state,
        message: "Authenticating...",
        loginAlert: false,
      }
    case "user":
      return {
        ...state,
        user: action.text,
        isAuthenticating: false,
        loginAlert: false,
      }
    case "ticket":
      return {
        ...state,
        ticketNumber: action.text,
      }
    case "nettskjemaInfo":
      return {
        ...state,
        nettskjemaInfo: action.text,
      }
    case "datasetVersionId":
      return {
        ...state,
        datasetVersionId: action.text,
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
