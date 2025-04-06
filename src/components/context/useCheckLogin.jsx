import { useState, useEffect } from 'react'

export function useCheckLogin () {

    const TOKEN_URL = import.meta.env.VITE_TOKEN_ENDPOINT
    //console.log('TOKEN_URL:', TOKEN_URL)
    const [loginAlert, setLoginAlert] = useState(true);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");

        if (code) {
        fetch(`${TOKEN_URL}?code=${code}`)
            .then((response) => response.json())
            .then((data) => {
            console.log(data);
            setToken(data.token.access_token);
            setLoginAlert(false);
            })
            .then(window.history.replaceState(null, null, window.location.pathname))
            .catch((error) => console.error("Token couldn't be retrieved", error));
        }
    }, []);

    return loginAlert
}