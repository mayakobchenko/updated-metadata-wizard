import { useState, useEffect, useRef } from 'react'
import authFunctions from "./authenticate"
import { useAuthContext, useAuthDispatch } from "./AuthProviderContext.jsx"

console.log(`useAuth is working`);

export function useAuth () {
    const [loginAlert, setLoginAlert] = useState(true);
    const [token, setToken] = useState(null);
    const [user, setUser] = useState(null);
    const [message, setMessage] = useState("Loading...")
    const [isAuthenticating, setIsAuthenticating] = useState(true);
    const hasAuthenticatedRef = useRef(false);

    if ( urlContainsAuthenticationParameters() ) {
        hasAuthenticatedRef.current = true
      }
    function handleLoginError() {
        const url = new URL(window.location.href);
        url.searchParams.delete('error');
        window.history.replaceState({}, document.title, url.toString());
        setIsAuthenticating(false)
      }
    function handleTokenReceived(token) {
        setToken(token)
        const url = new URL(window.location.href);
        url.searchParams.delete('code');
        url.searchParams.delete('iss');
        url.searchParams.delete('session_state');
        window.history.replaceState({}, document.title, url.toString());
        setMessage("Retrieving user info...")
      }
    useEffect(() => {
        if (!hasAuthenticatedRef.current) {
          setMessage("Redirecting to EBRAINS IAM...")
          authFunctions.authenticate()
        } else {
          if (window.location.href.includes('error=')) {
            handleLoginError()
          } else if (window.location.href.includes('code=')) {
            setMessage("Authenticating...")
            setLoginAlert(false)
            authFunctions.getToken()
              .then( (token) => {
                handleTokenReceived(token);
                //setLoginAlert(false);
                authFunctions.getUser(token);
                return authFunctions.getUserKG(token); })
                  .then( (user) => {
                    console.log(user.username)
                    setUser(user)
                    setIsAuthenticating(false)} )
          } else {
          }
        }
      }, [])

      return {user, token}
}

function urlContainsAuthenticationParameters() {
    const URL = window.location.href
    return (URL.includes('error=') || URL.includes('code='))
  }