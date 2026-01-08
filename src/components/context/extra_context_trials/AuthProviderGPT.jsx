// AuthProvider.js
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import apiClient from '../services/apiClient'
import { tokenService } from '../services/tokenService'

const AuthContext = createContext()

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // call this after login/refresh to set access token in-memory
  const setAccessToken = useCallback((token) => {
    tokenService.setToken(token);
  }, []);

  const clearAuth = useCallback(() => {
    tokenService.clearToken();
    setUser(null);
  }, []);

  const login = useCallback(async (credentials) => {
    // POST /auth/login returns { accessToken, user } and sets httpOnly refresh cookie
    const resp = await apiClient.post('/auth/login', credentials, { withCredentials: true });
    const { accessToken, user: u } = resp.data;
    setAccessToken(accessToken);
    setUser(u);
    return u;
  }, [setAccessToken]);

  const logout = useCallback(async () => {
    try {
      // POST logout to clear server refresh session/cookie
      await apiClient.post('/auth/logout', {}, { withCredentials: true });
    } catch (err) {
      // swallow or log
    } finally {
      clearAuth();
    }
  }, [clearAuth]);

  // attempt to restore session on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Call refresh endpoint. Server reads httpOnly refresh cookie, validates server-side storage, and returns new access token and optionally user
        const refreshResp = await apiClient.post('/auth/refresh', {}, { withCredentials: true });
        const { accessToken, user: u } = refreshResp.data;
        if (!mounted) return;
        setAccessToken(accessToken);
        if (u) setUser(u);
      } catch (err) {
        clearAuth();
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [clearAuth, setAccessToken]);

  const value = {
    user,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
