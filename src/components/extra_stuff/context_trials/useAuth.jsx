import { useState, useEffect, useRef } from 'react'
import authFunctions from "./authenticate"
import { useAuthDispatch } from "./AuthProviderContext.jsx"

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
        dispatch({type: 'loginError'})
      }
    function handleTokenReceived(token) {
        dispatch({type: 'gotToken', text: token});
        setToken(token)
        const url = new URL(window.location.href);
        url.searchParams.delete('code');
        url.searchParams.delete('iss');
        url.searchParams.delete('session_state');
        window.history.replaceState({}, document.title, url.toString());
      }
    useEffect(() => {
      let isMounted = true;
        if (!hasAuthenticatedRef.current) {
          authFunctions.authenticate()
          dispatch({type: 'redirect'})
        } else {
          if (window.location.href.includes('error=')) {
            handleLoginError()
          } else if (window.location.href.includes('code=')) {
            dispatch({type: 'code'})
            
            const fetchUserData = async () => {
              try {
                  const token = await authFunctions.getToken();
                  const user = await authFunctions.getUser(token);
      
                  if (isMounted) {
                      setUser(user);
                      dispatch({ type: 'user', text: user });
                  }
              } catch (error) {
                  console.error('Unable to fetch user data:', error);
              }
          };
      
          fetchUserData();

           /* authFunctions.getToken()
              .then( (token) => {
                handleTokenReceived(token);
                const user_server = authFunctions.getUser(token);
                console.log(user_server)
                return user_server; })
                  .then( (user) => {
                    console.log(user)
                    setUser(user)
                    dispatch({type: 'user', text: user});})*/


          } else {
          }}
        return () => {
          isMounted = false };
      }, [])
}

                /*return authFunctions.getUser(token);*/
                /*return authFunctions.getUserKG(token);*/

function urlContainsAuthenticationParameters() {
    const URL = window.location.href
    return (URL.includes('error=') || URL.includes('code='))
  }