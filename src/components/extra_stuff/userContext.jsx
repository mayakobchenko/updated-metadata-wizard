import React, { useState, useRef, useContext } from 'react';
import { loginContext } from './loginContext.jsx';
import authenticate from "../authentication/authenticate.js"; 
import getUser from '../authentication/GetUserInfo.js';
import getToken from '../authentication/authenticationUtilities.js';

const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState("Loading...")
  const [isAuthenticating, setIsAuthenticating] = useState(true);  
  const tokenRef = useRef('');
  const hasAuthenticatedRef = useRef(false);

  if ( urlContainsAuthenticationParameters() ) {
    hasAuthenticatedRef.current = true
  }

  function handleTokenReceived(token) {
    ///window.history.pushState({}, document.title, "/") // clear url 
    //setToken(token)
    tokenRef.current = token

    // clean the url for OIDC parameters
    const url = new URL(window.location.href);
    url.searchParams.delete('code');
    url.searchParams.delete('iss');
    url.searchParams.delete('session_state');

    // Replace the current URL without the three parameters
    window.history.replaceState({}, document.title, url.toString());

    setMessage("Retrieving user info...")
    return token
  }

  function handleUserReceived(user) {
    setUser(user)
    setIsAuthenticating(false)
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
        getToken()
          .then( (token) => handleTokenReceived(token) )
            .then( (token) => getUser(token) )
              .then( (user) => handleUserReceived(user) )
      } else {
        //pass
      }
    }
  }, [])

  return (
    <loginContext
      value={{
        user,
        tokenRef,
        message,
        isAuthenticating,
      }}>
      {children}
    </loginContext>
  );
};

// Custom hook to use the Context
const useUserContext = () => {
  const userContext = useContext(loginContext);
  if (!userContext) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  console.log('userContext', userContext);
  return userContext;
};

export { UserProvider, useUserContext };

function urlContainsAuthenticationParameters() {
  const URL = window.location.href
  console.log('url', URL);
  return (URL.includes('error=') || URL.includes('code='))
}