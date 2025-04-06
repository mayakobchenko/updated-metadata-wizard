import { useState, useEffect, useRef } from 'react'
import { getToken, authenticate, getUser } from "./authenticate.jsx"

export function useCheckUserConnected() {

    const [message, setMessage] = useState("Loading...")
    const tokenRef = useRef('')
    const [user, setUser] = useState(null)

    useEffect(() => {
        let active = true  

        const checkUser = async () => {
            if (!(window.location.href.includes('error=') || window.location.href.includes('code='))) {
                await authenticate()
                if (active){
                    setMessage("Redirecting to EBRAINS IAM service ...")
                    console.log('redirecting to IAM...')}
            } else if (window.location.href.includes('code=')) {
                    console.log('found code in url, fetching token')
                    const token = await getToken()
                    tokenRef.current = token
                    const url = new URL(window.location.href)
                    url.searchParams.delete('code')
                    url.searchParams.delete('iss')
                    url.searchParams.delete('session_state')
                    window.history.replaceState({}, document.title, url.toString()) 
                    if (active) {setMessage("Retrieving user info...")}
                    const user = await getUser(token)
                    console.log('user:', user)
                    if (active) {setUser(user)}
            }
            else if (window.location.href.includes('error=')){
                    const url = new URL(window.location.href)
                    url.searchParams.delete('error')
                    window.history.replaceState({}, document.title, url.toString())
            }
        }
   
        checkUser()

      return () => {
        active = false
      }
    }, []);

    return {user, message}
  }

  