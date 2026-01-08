import React, { createContext, useReducer, useEffect, useRef, useCallback } from "react"
import authFunctions from "../authenticate"
/*
  Expect authFunctions API:
    - authenticate(): triggers OIDC login redirect (no return)
    - getToken(): returns Promise<string> resolving to access token (after redirect with code)
    - getUserKG(token): returns Promise<object> resolving to user info
*/

export const AuthContext = createContext(null);

// Convenience hooks for consumers
export function useAuthState() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuthState must be used within AuthProvider");
  return ctx.state;
}
export function useAuthDispatch() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuthDispatch must be used within AuthProvider");
  return ctx.dispatch;
}

const initialState = {
  user: null,
  token: null,
  status: "idle", // 'idle' | 'checking' | 'authenticated' | 'unauthenticated' | 'error'
  error: null,
};

function authReducer(state, action) {
  switch (action.type) {
    case "CHECK_START":
      return { ...state, status: "checking", error: null };
    case "CHECK_SUCCESS":
      return {
        ...state,
        status: "authenticated",
        user: action.user ?? state.user,
        token: action.token ?? state.token,
        error: null,
      };
    case "CHECK_FAIL":
      return { ...initialState, status: "unauthenticated", error: action.error ?? null };
    case "GOT_TOKEN":
      return { ...state, token: action.token, status: "authenticated", error: null };
    case "SET_USER":
      return { ...state, user: action.user, status: action.user ? "authenticated" : state.status };
    case "LOGOUT":
      return { ...initialState, status: "unauthenticated" };
    case "ERROR":
      return { ...state, status: "error", error: action.error };
    default:
      return state;
  }
}

export default function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Avoid running authenticate() twice if app mount runs multiple times (your pattern)
  const hasAuthenticatedRef = useRef(false);
  // Track mounted to avoid setState after unmount
  const mountedRef = useRef(false);

  // Helper to check if URL contains OIDC params
  function urlContainsAuthenticationParameters() {
    const URL = window.location.href;
    return URL.includes("error=") || URL.includes("code=");
  }

  // Remove specific query params from URL (helper)
  const removeUrlParams = useCallback((params = []) => {
    try {
      const url = new URL(window.location.href);
      params.forEach((p) => url.searchParams.delete(p));
      window.history.replaceState({}, document.title, url.toString());
    } catch (err) {
      // ignore
    }
  }, []);

  // Handle error param in URL
  function handleLoginError() {
    removeUrlParams(["error"]);
  }

  // Called after we receive token from backend via authFunctions.getToken()
  function handleTokenReceived(token) {
    dispatch({ type: "GOT_TOKEN", token });
    removeUrlParams(["code", "iss", "session_state"]);
  }

  // Main mount effect: orchestrates the authenticate / getToken / getUserKG flow
  useEffect(() => {
    mountedRef.current = true;

    // If URL has auth params mark hasAuthenticatedRef so we know we just returned from IAM
    if (urlContainsAuthenticationParameters()) {
      hasAuthenticatedRef.current = true;
    }

    (async () => {
      try {
        // If we did not come back from the IAM redirect, start the authenticate flow.
        if (!hasAuthenticatedRef.current) {
          // This will usually redirect the browser and not return; but keep for local flows
          // e.g., authFunctions.authenticate() may open a popup or redirect. It should be idempotent.
          try {
            authFunctions.authenticate();
            // don't set any local state here — redirect likely leaves page
          } catch (err) {
            // If authenticate throws synchronously for some reason, log and continue
            console.error("authFunctions.authenticate error:", err);
            // fall through to not break the mount
          }
          return;
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
        console.error("AuthProvider mount flow error:", err);
        dispatch({ type: "ERROR", error: err.message || String(err) });
      }
    })();

    return () => {
      mountedRef.current = false;
    };
  }, [removeUrlParams]);

  // logout helper
  const logout = useCallback(() => {
    // If you have a backend logout endpoint, call it here.
    // For now, purely local cleanup:
    // - clear stored token/user
    dispatch({ type: "LOGOUT" });
    // Optionally, call backend logout route:
    // fetch('/auth/logout', { method: 'POST', credentials: 'include' })
  }, []);

  const value = {
    state,
    dispatch,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
