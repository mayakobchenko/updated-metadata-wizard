//import { useCheckLogin } from "./context/useCheckLogin";
import { useState, useEffect, useRef } from 'react'
import authFunctions from "../context/authenticate"
import {Box, CircularProgress, Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions, Button} from "@mui/material"

const TOKEN_URL = import.meta.env.VITE_TOKEN_ENDPOINT
const OIDC = import.meta.env.VITE_APP_OIDC
const MY_URL = import.meta.env.VITE_APP_MY_URL
const clientId = import.meta.env.VITE_WIZARD_OIDC_CLIENT_ID
const USER_INFO_URL = import.meta.env.VITE_APP_USER_INFO_URL
console.log(`Welcome text`);
//user,tokenRef,message,isAuthenticating

const handleLogin = () => {
  window.location.href = `${OIDC}?response_type=code&login=true&client_id=${clientId}&redirect_uri=${MY_URL}`;
};

export default function WelcomeText() {

  //const loginStatus = useCheckLogin();

  const [loginAlert, setLoginAlert] = useState(true);
  const [token, setToken] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState("Loading...")
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  //const tokenRef = useRef('');
  const hasAuthenticatedRef = useRef(false);

  if ( urlContainsAuthenticationParameters() ) {
    hasAuthenticatedRef.current = true
  }
  function handleTokenReceived(token) {
    setToken(token)
    const url = new URL(window.location.href);
    url.searchParams.delete('code');
    url.searchParams.delete('iss');
    url.searchParams.delete('session_state');
    window.history.replaceState({}, document.title, url.toString());
    setMessage("Retrieving user info...")
    //return token
  }
  function handleLoginError() {
    const url = new URL(window.location.href);
    url.searchParams.delete('error');
    window.history.replaceState({}, document.title, url.toString());
    setIsAuthenticating(false)
  }
  useEffect(() => {
    if (!hasAuthenticatedRef.current) {
      setMessage("Redirecting to EBRAINS IAM...")
      authFunctions.authenticate()
    } else {
      if (window.location.href.includes('error=')) {
        handleLoginError()
      } else if (window.location.href.includes('code=')) {
        setMessage("Authenticating...")
        setLoginAlert(false)
        authFunctions.getToken()
          .then( (token) => {
            //console.log(token);
            handleTokenReceived(token);
            setLoginAlert(false);
            authFunctions.getUser(token);
            return authFunctions.getUserKG(token); })
              .then( (user) => {
                console.log(user.username)
                setUser(user)
                setIsAuthenticating(false)} )
      } else {
      }
    }
  }, [])

//Brief timeout for UX qol
  useEffect(() => {
      if (!token) {
      const timer = setTimeout(() => setShowDialog(true), 5000);
      return () => clearTimeout(timer);
      } else {
        setShowDialog(false);
      }
  }, [token]);

  if (!token) {
    if (!showDialog) {
      return (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "100vh",
            backgroundColor: "#f0f0f0",
            flexDirection: "column",
          }}>
          <Typography variant="body" fontSize={20} color="text.primary" mb={15}>
            Wizard is loading ...
          </Typography>
          <CircularProgress size={25} />
        </Box>
      );
    }
    return (
      <Dialog
        open={true}
      >
        <DialogTitle>Welcome to Ebrains Metadata Wizard</DialogTitle>
        <DialogContent>
          <Typography>
            Please login to access the Ebrains Wizard and services.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={handleLogin}>
            Login
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

    return (
      <div>
          <h1>{user ? `Welcome, ${user.fullname}!` : 'Problem to get user'}</h1>
      </div>
    )  
  
}

function urlContainsAuthenticationParameters() {
  const URL = window.location.href
  return (URL.includes('error=') || URL.includes('code='))
}