import { useState, useEffect, useRef } from 'react'
import authFunctions from "./authenticate"
import { useAuthDispatch } from "./AuthProviderContext.jsx"

export function useAuth () {

    const hasAuthenticatedRef = useRef(false);
    const hasTicketRef = useRef(false);
    const [token, setToken] = useState(null);
    const [user, setUser] = useState(null);
    const dispatch = useAuthDispatch();

    if (urlContainsAuthenticationParameters()) {
        hasAuthenticatedRef.current = true}
    if (urlContainsTicket()) {
       hasTicketRef.current = true}  
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
      const fetchTicket = async () => {
        if (hasTicketRef.current) {
            try {
                const ticketNumber = await authFunctions.getTicket()
                dispatch({type: 'ticket', text: ticketNumber})
                const nettskjemaId = await authFunctions.zammad(ticketNumber)
                dispatch({type: 'nettskjemaId', text: nettskjemaId})
                const nettskjemaInfo = await authFunctions.nettskjema(nettskjemaId)
                const skjemaInfo = {contactFirstName: nettskjemaInfo.ContactInfo[0], 
                                     contactSurname: nettskjemaInfo.ContactInfo[1], 
                                     contactEmail: nettskjemaInfo.ContactInfo[2],
                                    custodionaFirstName: nettskjemaInfo.CustodianInfo[0],
                                    custodianSurname: nettskjemaInfo.CustodianInfo[1],
                                    custodianEmail: nettskjemaInfo.CustodianInfo[2],
                                    dataTitle: nettskjemaInfo.DataInfo[0]}
                dispatch({type: 'nettskjemaInfo', text: skjemaInfo})
              
                /*const ticketObject = { number: ticketNumber }
                if (ticketNumber) {
                    localStorage.setItem('ticket', JSON.stringify(ticketObject))}*/
            } catch (error) {
                console.error('Error fetching ticket:', error)
            }}}
      fetchTicket()
      if (!hasAuthenticatedRef.current) {
        authFunctions.authenticate()
        dispatch({type: 'redirect'})
      } else {
        if (window.location.href.includes('error=')) {
          handleLoginError()
        } else if (window.location.href.includes('code=')) {
          dispatch({type: 'code'})
          authFunctions.getToken()
            .then( (token) => {
              handleTokenReceived(token);
              const user_server = authFunctions.getUser(token)
              console.log('got from backend:', user_server)
              /*return authFunctions.getUser(token);*/
              return authFunctions.getUserKG(token)})
                .then( (user) => {
                  //console.log(user)
                  setUser(user)
                  dispatch({type: 'user', text: user})})}
      }}, [])
}

function urlContainsAuthenticationParameters () {
    const URL = window.location.href
    return (URL.includes('error=') || URL.includes('code='))
  }
function urlContainsTicket () {
  const URL = window.location.href
  return (URL.includes('TicketNumber='))
}  