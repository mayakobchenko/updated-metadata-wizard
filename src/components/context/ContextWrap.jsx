import React, { useState, useRef } from 'react'
import { LoginContext } from "./LoginContext.jsx"
import {getToken, authenticate, getUser } from "./authenticate.jsx"

export default function ContextWrap({children}) {
    const [user, setUser] = useState(null);
    const [message, setMessage] = useState("Loading...")
    const [isAuthenticating, setIsAuthenticating] = useState(true);
    const tokenRef = useRef('');
    const hasAuthenticatedRef = useRef(false);

    if ( urlContainsAuthenticationParameters() ) {
        hasAuthenticatedRef.current = true
        console.log('has user authenticated:', hasAuthenticatedRef.current)
      }
    function handleUserReceived(user) {
        setUser(user)
        setIsAuthenticating(false)
    }
    function handleTokenReceived(token) {
        tokenRef.current = token
        const url = new URL(window.location.href);
        url.searchParams.delete('code');
        url.searchParams.delete('iss');
        url.searchParams.delete('session_state');
        window.history.replaceState({}, document.title, url.toString());    
        setMessage("Retrieving user info...")
        return token
    }  
    function handleLoginError() {
        const url = new URL(window.location.href);
        url.searchParams.delete('error');
        window.history.replaceState({}, document.title, url.toString());
        setIsAuthenticating(false)
    }
    React.useEffect(() => {
        if (!hasAuthenticatedRef.current) {
          setMessage("Redirecting to EBRAINS IAM...")
          authenticate()
    
        } else {
          if (window.location.href.includes('error=')) {
            handleLoginError()
    
          } else if (window.location.href.includes('code=')) {
            setMessage("Authenticating...")
            try {
                const pretoken = getToken()
                const token = handleTokenReceived(pretoken)
                const user = getUser(token)
                handleUserReceived(user)
            } catch  (error) {
                console.error('Error occurred while logging in:', error.message);
            }
          } else {
            //pass
          }
        }
      }, [])

    return (
        <LoginContext value={{user: user, message: message, isAuthenticating: isAuthenticating}}>
            {children}
        </LoginContext>
    );
}

function urlContainsAuthenticationParameters() {
    const URL = window.location.href
    return (URL.includes('error=') || URL.includes('code='))
  }
