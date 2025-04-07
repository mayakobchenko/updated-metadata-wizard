import { useState, useRef, useEffect } from 'react'
import {getToken, authenticate, getUser } from "../context/authenticate.jsx"

export function useCheckUser() {

    const [user, setUser] = useState(null)
    const [message, setMessage] = useState("Loading...")
    const [isAuthenticating, setIsAuthenticating] = useState(true)
    const tokenRef = useRef('')
    const hasAuthenticatedRef = useRef(false)

    if ( urlContainsAuthenticationParameters() ) {
        hasAuthenticatedRef.current = true 
        console.log('has url some params :', hasAuthenticatedRef.current)}

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
        console.log('login required')
        const url = new URL(window.location.href)
        url.searchParams.delete('error')
        window.history.replaceState({}, document.title, url.toString())
        setMessage('Please log in')
        setIsAuthenticating(false)}

    useEffect(() => {

        async function fetchUserCred () {
            if (!ignore){setMessage("Authenticating...")}
            console.log('found code in url, fetching token')
            const token = await getToken()
            if (!ignore){
                //console.log('ignore:', ignore)
                //tokenRef.current = token
                await handleTokenReceived(token)
            }

            const user = await getUser(token)
            //console.log('fetched user data', user)
            handleUserReceived(user)
        }

        async function redirectIAM () {
            if (!ignore){setMessage("Redirecting to EBRAINS IAM service ...")}
            console.log('authenticated:', hasAuthenticatedRef.current, 'redirecting to IAM')
            await authenticate()
        }

        let ignore = false
        if (!hasAuthenticatedRef.current) {
            redirectIAM()
            console.log(' redirectIAM ingnore:', ignore)
        } 
        else if (window.location.href.includes('code=')) {
            fetchUserCred()
            console.log('fetchUserCred ingnore:', ignore)
        }
        else if (window.location.href.includes('error=')) {handleLoginError()
            console.log('handleLoginError ingnore:', ignore)       
        }

        return () => {
            ignore = true
        }
    }, [])
    
    return {user, message}
}

function urlContainsAuthenticationParameters() {
    const URL = window.location.href
    return (URL.includes('error=') || URL.includes('code='))
  }


  