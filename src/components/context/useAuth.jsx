import { useState, useEffect, useRef } from 'react'
import authFunctions from "./authenticate"
import { useAuthDispatch } from "./AuthProviderContext.jsx"

console.log(`useAuth is working`);

export function useAuth () {

    const hasAuthenticatedRef = useRef(false);
    const [token, setToken] = useState(null);
    const [user, setUser] = useState(null);
    const dispatch = useAuthDispatch();

    if ( urlContainsAuthenticationParameters() ) {
        hasAuthenticatedRef.current = true
      }
    function handleLoginError() {
        const url = new URL(window.location.href);
        url.searchParams.delete('error');
        window.history.replaceState({}, document.title, url.toString());
        //setIsAuthenticating(false)
        dispatch({type: 'loginError'})
      }
    function handleTokenReceived(token) {
        dispatch({type: 'gotToken', text: token});
        setToken(token)
        //setMessage("Retrieving user info...")
        const url = new URL(window.location.href);
        url.searchParams.delete('code');
        url.searchParams.delete('iss');
        url.searchParams.delete('session_state');
        window.history.replaceState({}, document.title, url.toString());
      }
    useEffect(() => {
        if (!hasAuthenticatedRef.current) {
          //setMessage("Redirecting to EBRAINS IAM...")
          authFunctions.authenticate()
          dispatch({type: 'redirect'})
        } else {
          if (window.location.href.includes('error=')) {
            handleLoginError()
          } else if (window.location.href.includes('code=')) {
            //setMessage("Authenticating...")
            //setLoginAlert(false)
            dispatch({type: 'code'})
            authFunctions.getToken()
              .then( (token) => {
                handleTokenReceived(token);
                //setLoginAlert(false);
                authFunctions.getUser(token);
                return authFunctions.getUserKG(token); })
                  .then( (user) => {
                    console.log(user.username)
                    setUser(user)
                    //setIsAuthenticating(false) 
                    dispatch({type: 'user', text: user});})
          } else {
          }
        }
      }, [])

      //return {user, token}
}

function urlContainsAuthenticationParameters() {
    const URL = window.location.href
    return (URL.includes('error=') || URL.includes('code='))
  }