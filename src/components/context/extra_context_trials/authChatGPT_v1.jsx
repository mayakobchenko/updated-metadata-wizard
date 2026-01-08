// AuthProviderContext.jsx
import React, { createContext, useReducer, useEffect, useRef } from "react"
export const AuthContext = createContext()

const initialState = {
  user: null,
  status: "idle", // 'idle' | 'checking' | 'authenticated' | 'unauthenticated' | 'error'
  error: null,
};

function authReducer(state, action) {
  switch (action.type) {
    case "CHECK_START":
      return { ...state, status: "checking", error: null };
    case "CHECK_SUCCESS":
      return { ...state, status: "authenticated", user: action.user, error: null };
    case "CHECK_FAIL":
      return { ...state, status: "unauthenticated", user: null, error: action.error || null };
    case "LOGOUT":
      return { ...initialState, status: "unauthenticated" };
    default:
      return state; // reducer is pure — no side effects here
  }
}

export default function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Keep a ref to the current abort controller and a requestId to ignore stale responses
  const abortRef = useRef(null);
  const lastRequestId = useRef(0);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    const token = localStorage.getItem("authToken");
    // if no token, set unauthenticated quickly and return
    if (!token) {
      dispatch({ type: "CHECK_FAIL", error: null });
      return;
    }

    // Start new request: cancel previous one (if any)
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    const requestId = ++lastRequestId.current; // increment request id for this call

    dispatch({ type: "CHECK_START" });

    // Example endpoint that verifies token and returns user info
    fetch("/api/auth/verify", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) {
          const err = new Error("Not authenticated");
          err.status = res.status;
          throw err;
        }
        return res.json();
      })
      .then((data) => {
        // Ignore if this response is stale or effect was cleaned up
        if (controller.signal.aborted) return;
        if (requestId !== lastRequestId.current) return; // stale
        // Only update state if still mounted
        if (!mountedRef.current) return;
        dispatch({ type: "CHECK_SUCCESS", user: data.user });
      })
      .catch((err) => {
        if (err.name === "AbortError") return; // expected on cancellation
        if (requestId !== lastRequestId.current) return; // stale
        if (!mountedRef.current) return;
        console.error("Auth check error:", err);
        dispatch({ type: "CHECK_FAIL", error: err.message || "Auth check failed" });
      });

    // cleanup when effect re-runs or provider unmounts
    return () => {
      controller.abort();
    };
  }, []); // run on mount; adjust deps if you want to re-check on token change etc.

  useEffect(() => {
    // mark unmounted on cleanup to avoid setState after unmount
    return () => {
      mountedRef.current = false;
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // helper actions you can provide to children
  const logout = () => {
    // purely update local state and store; any network call would also be done in an effect/handler
    localStorage.removeItem("authToken");
    // cancel any in-flight auth checks
    if (abortRef.current) abortRef.current.abort();
    lastRequestId.current++;
    dispatch({ type: "LOGOUT" });
  };

  const value = {
    state,
    dispatch,
    logout,
    // optionally: login(token) that stores token and triggers re-check
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
