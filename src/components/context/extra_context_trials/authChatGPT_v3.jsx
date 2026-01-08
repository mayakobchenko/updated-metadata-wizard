import React, {
  createContext,
  useReducer,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import authFunctions from "../authenticate"; // your module: authenticate(), getToken(), getUserKG(), login(), logout(), getUser()
import {
  requestJson,
  setAccessToken as tokenServiceSetAccessToken,
  clearAccessToken as tokenServiceClearAccessToken,
} from "./services/apiClient"; // adjust path if needed

// Context and hooks
export const AuthContext = createContext(null);

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

// Convenience hook consumers can use
export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  const { state, login, logout } = ctx;
  return {
    user: state.user,
    status: state.status,
    error: state.error,
    login,
    logout,
  };
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

  const mountedRef = useRef(false);
  const hasAuthenticatedRef = useRef(false); // set when URL contains code/error (we returned from IAM)

  const urlContainsAuthenticationParameters = useCallback(() => {
    const href = window.location.href;
    return href.includes("error=") || href.includes("code=");
  }, []);

  const removeUrlParams = useCallback((params = []) => {
    try {
      const url = new URL(window.location.href);
      params.forEach((p) => url.searchParams.delete(p));
      window.history.replaceState({}, document.title, url.toString());
    } catch (err) {
      // ignore
    }
  }, []);

  const handleLoginError = useCallback(() => {
    removeUrlParams(["error"]);
  }, [removeUrlParams]);

  const handleTokenReceived = useCallback(
    (token) => {
      if (!token) return;
      dispatch({ type: "GOT_TOKEN", token });
      try {
        tokenServiceSetAccessToken(token);
      } catch (err) {
        console.error("Failed to set access token in tokenService:", err);
      }
      removeUrlParams(["code", "iss", "session_state"]);
    },
    [removeUrlParams]
  );

  useEffect(() => {
    mountedRef.current = true;

    if (urlContainsAuthenticationParameters()) {
      hasAuthenticatedRef.current = true;
    }

    (async () => {
      try {
        // First: silent refresh attempt using backend refresh endpoint
        // If this succeeds we are authenticated without redirecting.
        dispatch({ type: "CHECK_START" });
        try {
          const refreshData = await requestJson("/auth/refresh", { method: "POST" });
          // Expecting { accessToken, user? }
          if (refreshData && refreshData.accessToken) {
            if (!mountedRef.current) return;
            handleTokenReceived(refreshData.accessToken);
            if (refreshData.user) {
              dispatch({ type: "SET_USER", user: refreshData.user });
            }
            dispatch({ type: "CHECK_SUCCESS", user: refreshData.user, token: refreshData.accessToken });
            return; // silent refresh succeeded — done
          }
          // If response received but no token, treat as failure and fall through to next steps
        } catch (refreshErr) {
          // silent refresh failed (no cookie/session or expired) — continue to check OIDC params and redirect flow
          // Do not log full stack for expected 401; just debug
          // console.debug("Silent refresh failed:", refreshErr);
        }

        // If silent refresh did not authenticate, proceed with normal OIDC redirect logic
        if (!hasAuthenticatedRef.current) {
          // Not returned from IAM; start authenticate (likely redirects)
          try {
            await authFunctions.authenticate();
            // authenticate typically redirects; if it returns, nothing else to do here
            return;
          } catch (authErr) {
            console.error("authFunctions.authenticate error:", authErr);
            // continue — maybe we are in a special flow where authenticate cannot redirect
          }
        }

        // If we arrived here and URL contains error param
        if (window.location.href.includes("error=")) {
          handleLoginError();
          dispatch({ type: "CHECK_FAIL", error: "Login error present in URL" });
          return;
        }

        // If URL has code param exchange code -> token -> get user
        if (window.location.href.includes("code=")) {
          dispatch({ type: "CHECK_START" });
          try {
            const token = await authFunctions.getToken(); // returns string (tokenResponse.text())
            if (!mountedRef.current) return;
            if (!token) {
              dispatch({ type: "CHECK_FAIL", error: "No token returned from getToken" });
              return;
            }
            handleTokenReceived(token);

            // Prefer KG user info first, then fallback to backend user
            try {
              const user = await authFunctions.getUserKG(token);
              if (!mountedRef.current) return;
              if (user) {
                dispatch({ type: "SET_USER", user });
                dispatch({ type: "CHECK_SUCCESS", user, token });
                return;
              }
            } catch (kgErr) {
              console.warn("getUserKG failed, falling back to backend getUser:", kgErr);
            }

            try {
              const backendUser = await authFunctions.getUser(token);
              if (!mountedRef.current) return;
              if (backendUser) {
                dispatch({ type: "SET_USER", user: backendUser });
              }
              dispatch({ type: "CHECK_SUCCESS", user: backendUser, token });
            } catch (beErr) {
              if (!mountedRef.current) return;
              console.warn("getUser failed after token exchange:", beErr);
              dispatch({ type: "CHECK_SUCCESS", token });
            }
          } catch (tokenErr) {
            if (!mountedRef.current) return;
            console.error("getToken error:", tokenErr);
            dispatch({ type: "CHECK_FAIL", error: tokenErr.message || String(tokenErr) });
          }
        } else {
          // No code and silent refresh didn't authenticate -> unauthenticated
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
  }, [urlContainsAuthenticationParameters, handleLoginError, handleTokenReceived]);

  // Provide login helper (calls authFunctions.login which redirects to login URL)
  const login = useCallback(async () => {
    try {
      await authFunctions.login();
    } catch (err) {
      console.error("login() failed:", err);
      dispatch({ type: "ERROR", error: err.message || String(err) });
    }
  }, []);

  // logout: clear in-memory token + dispatch LOGOUT + call authFunctions.logout (redirect)
  const logout = useCallback(async () => {
    try {
      try {
        tokenServiceClearAccessToken();
      } catch (err) {
        try {
          tokenServiceSetAccessToken(null);
        } catch (e) {
          // ignore if neither exists
        }
      }
      dispatch({ type: "LOGOUT" });
      // call backend logout redirect (authFunctions.logout will fetch logout url then redirect)
      await authFunctions.logout();
    } catch (err) {
      console.error("logout() error:", err);
    }
  }, []);

  const value = useMemo(
    () => ({
      state,
      dispatch,
      login,
      logout,
    }),
    [state, dispatch, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
