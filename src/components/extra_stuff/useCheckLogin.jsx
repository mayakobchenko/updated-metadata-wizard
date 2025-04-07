import { useState, useEffect } from 'react'

const TOKEN_URL = import.meta.env.VITE_TOKEN_ENDPOINT

export function useCheckLogin () {

    //console.log('TOKEN_URL:', TOKEN_URL)
    const [loginStatus, setLoginStatus] = useState(false);
    const [token, setToken] = useState(null);
    const [redirectIAM, setRedirectIAM] = useState(false);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");

        if (code) {
        fetch(`${TOKEN_URL}?code=${code}`)
            .then((response) => response.json())
            .then((data) => {
            console.log(data);
            setToken(data.token.access_token);
            setLoginStatus(trues);
            })
            .then(window.history.replaceState(null, null, window.location.pathname))
            .catch((error) => console.error("Token couldn't be retrieved", error));
        }
    }, []);

      // Brief timeout for UX qol
    useEffect(() => {
        if (!token) {
        const timer = setTimeout(() => setRedirectIAM(true), 2000);
        return () => clearTimeout(timer);
        } else {
            setRedirectIAM(false);
        }
    }, [token]);

    return loginStatus
}