import React, { useReducer, useState, useRef, createContext, useContext } from 'react';
import {getToken, authenticate, getUser } from "./authenticate.jsx"
//import { AuthContext, LoginDispatchContext, authReducer, initialState } from "./AuthContext.jsx"

export const initialState = {
  isLoggingButton: false,
  user: null,    
  tokenRef: '', 
  message: 'Loading...',
  isAuthenticating: false
}

export const AuthContext = createContext(initialState);
export const LoginDispatchContext = createContext(null);

export default function AuthProvider ({ children }) {
    const [state, dispatch] = useReducer(authReducer, initialState);  
    const [user, setUser] = useState(null)
    const [message, setMessage] = useState("Loading...")
    const [isAuthenticating, setIsAuthenticating] = useState(true)
    const tokenRef = useRef('')
    const hasAuthenticatedRef = useRef(false)

    if ( urlContainsAuthenticationParameters() ) {
      hasAuthenticatedRef.current = true 
      //console.log('has user authenticated:', hasAuthenticatedRef.current)
    }
    function handleUserReceived(user) {
        setUser(user)
        console.log('user:', user)
        setIsAuthenticating(false)}
    async function handleTokenReceived(token) {
        tokenRef.current = token
        const url = new URL(window.location.href)
        url.searchParams.delete('code')
        url.searchParams.delete('iss')
        url.searchParams.delete('session_state')
        window.history.replaceState({}, document.title, url.toString())   
        setMessage("Retrieving user info...")
        console.log('handle token function was run')} 
    function handleLoginError() {
      console.log('handle login error functions')
      const url = new URL(window.location.href)
      url.searchParams.delete('error')
      window.history.replaceState({}, document.title, url.toString())
      setIsAuthenticating(false)}    
    React.useEffect(() => {
      async function fetchUserCred () {
          setMessage("Authenticating...")
          console.log('found code in url, fetching token')
          const token = await getToken()
          //console.log('fetched finally token:', token)
          if (!ignore){
              console.log('ignore:', ignore)
              //tokenRef.current = token
              await handleTokenReceived(token)
          }
          const user = await getUser(token)
          //console.log('fetched user data', user)
          handleUserReceived(user)
      }
      async function redirectIAM () {
          setMessage("Redirecting to EBRAINS IAM service ...")
          console.log('authenticated:', hasAuthenticatedRef.current, 'redirecting to IAM')
          await authenticate()
      }
      let ignore = false
      if (!hasAuthenticatedRef.current) {
          redirectIAM()
          //console.log('ignore redirectIAM', ignore)
      } 
      else if (window.location.href.includes('code=')) {
          fetchUserCred()
          console.log('ignore fetchUserCred', ignore)
      }
      else if (window.location.href.includes('error=')) {handleLoginError()}
      return () => {
          ignore = true
      }
    }, [])
    return (
      <AuthContext value={{user: user, message: message, isAuthenticating: isAuthenticating}}>
        <LoginDispatchContext value={dispatch}>
           {children}
        </LoginDispatchContext>
      </AuthContext>
    );
  };

function urlContainsAuthenticationParameters() {
  const URL = window.location.href
  return (URL.includes('error=') || URL.includes('code='))
}

export function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        isLoggingButton: true
      };
    case 'LOGOUT':
      return {
        ...state,
        isLoggingButton: false, 
        user: null
      };
    default:
      return state;
  }
};

export function useAuth() {
  return useContext(AuthContext);
}

export function useAuthDispatch() {
  return useContext(LoginDispatchContext);
}