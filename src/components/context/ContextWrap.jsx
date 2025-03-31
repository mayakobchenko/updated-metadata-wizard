//import React, { useState, useRef, useReducer } from 'react'
import React, { useState, useRef } from 'react'
//import { AuthContext, LoginDispatchContext } from "./AuthContext.jsx"
import { LoginContext } from "./LoginContext.jsx"
import {getToken, authenticate, getUser } from "./authenticate.jsx"

//const initialState = {user: null, message: "Loading...", isAuthenticating: true, isLogin: false};

export default function ContextWrap({children}) {
    const [user, setUser] = useState(null)
    const [message, setMessage] = useState("Loading...")
    const [isAuthenticating, setIsAuthenticating] = useState(true)
    const tokenRef = useRef('')
    const hasAuthenticatedRef = useRef(false)
    //const [loginStart, setLoginStart] = useState(false)
    //const [state, dispatch] = useReducer(loginReducer, initialState);

    if ( urlContainsAuthenticationParameters() ) {
        hasAuthenticatedRef.current = true 
        console.log('has user authenticated:', hasAuthenticatedRef.current)}
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
//add function handling ticket number in the url
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
        <LoginContext value={{user: user, message: message, isAuthenticating: isAuthenticating}}>
            {children}
        </LoginContext>
    );
}

function urlContainsAuthenticationParameters() {
    const URL = window.location.href
    return (URL.includes('error=') || URL.includes('code='))
  }
