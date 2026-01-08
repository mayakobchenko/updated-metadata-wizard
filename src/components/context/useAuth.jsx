import { useState, useEffect, useRef } from 'react'
import authFunctions from "./authenticate"
import { useAuthDispatch } from "./old_context/AuthProviderContext.jsx"

export function useAuth () {

    const hasAuthenticatedRef = useRef(false)
    const [token, setToken] = useState(null)
    const [user, setUser] = useState(null)
    const dispatch = useAuthDispatch()

    if (urlContainsAuthenticationParameters()) {
      hasAuthenticatedRef.current = true}

    function handleLoginError() {
      const url = new URL(window.location.href)
      //console.log('error in url', url)
      url.searchParams.delete('error')
      //console.log('url without error', url)
      window.history.replaceState({}, document.title, url.toString())
    }

    function handleTokenReceived(token) {
        dispatch({type: 'gotToken', text: token})
        setToken(token)
        const url = new URL(window.location.href)
        url.searchParams.delete('code')
        url.searchParams.delete('iss')
        url.searchParams.delete('session_state')
        window.history.replaceState({}, document.title, url.toString())}

    useEffect(() => {
      if (!hasAuthenticatedRef.current) {
        console.log('running authFunctions.getRedirectUrl()')
        authFunctions.login()
      } else {
        if (window.location.href.includes('error=')) {
          handleLoginError()
        } else if (window.location.href.includes('code=')) {
          console.log('getToken auth function')
          authFunctions.getToken()
            .then( (token) => {
              handleTokenReceived(token)
              //const user_server = authFunctions.getUser(token)
              //console.log('got from backend:', user_server)
              /*return authFunctions.getUser(token);*/
              return authFunctions.getUserKG(token)})
                .then( (user) => {
                  console.log('getUserKG:',user)
                  setUser(user)
                  dispatch({type: 'user', text: user})})}
      }

    }, [])
}

function urlContainsAuthenticationParameters () {
    const URL = window.location.href
    return (URL.includes('error=') || URL.includes('code='))
  }