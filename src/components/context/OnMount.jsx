
import React, { useEffect, useState } from "react";

//import callUser from "../actions/createUser";
//import { useTabContext } from "./TabContext";
// Variable loading for URLs
//const OIDC = import.meta.env.VITE_APP_OIDC;
// Dev instance switch pain points
//const TOKEN_URL = import.meta.env.VITE_APP_TOKEN_URL;
//const MY_URL = import.meta.env.VITE_APP_MY_URL;

//const TOKEN_URL = process.env.REACT_APP_TOKEN_ENDPOINT;

const TOKEN_URL = import.meta.env.VITE_TOKEN_ENDPOINT
console.log('TOKEN_URL:', TOKEN_URL)

const [loginAlert, setLoginAlert] = useState(true);

// OnMount for all logins etc.
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
        // clean the url
        .then(window.history.replaceState(null, null, window.location.pathname))
        .catch((error) => console.error("Token couldn't be retrieved", error));
    }
  }, []);


  /* const EnvComponent = () => {
    const TOKEN_URL = import.meta.env.VITE_TOKEN_ENDPOINT
    console.log('TOKEN_URL:', TOKEN_URL) 
    return (
      <div>
        <h1>Environment Variables</h1>
        <p>API Key: {TOKEN_URL}</p>
      </div>
    )
  }
export default EnvComponent */