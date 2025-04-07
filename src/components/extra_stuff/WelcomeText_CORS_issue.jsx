//import { useCheckLogin } from "./context/useCheckLogin";

//CORS issue, response 500
import { useState, useEffect } from 'react'
import {Box, CircularProgress, Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions, Button} from "@mui/material";

const TOKEN_URL = import.meta.env.VITE_TOKEN_ENDPOINT
const OIDC = import.meta.env.VITE_APP_OIDC
const MY_URL = import.meta.env.VITE_APP_MY_URL
const clientId = import.meta.env.VITE_WIZARD_OIDC_CLIENT_ID
console.log(`Welcome text`);

const handleLogin = () => {
  window.location.href = `${OIDC}?response_type=code&login=true&client_id=${clientId}&redirect_uri=${MY_URL}`;
};

export default function WelcomeText() {
  const TOKEN_URL = import.meta.env.VITE_TOKEN_ENDPOINT
const OIDC = import.meta.env.VITE_APP_OIDC
const MY_URL = import.meta.env.VITE_APP_MY_URL
const clientId = import.meta.env.WIZARD_OIDC_CLIENT_ID
    //const loginStatus = useCheckLogin();
  const [loginAlert, setLoginAlert] = useState(true);
  const [token, setToken] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [user, setUser] = useState(null);

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

    // Brief timeout for UX qol
  useEffect(() => {
      if (!token) {
      const timer = setTimeout(() => setShowDialog(true), 2000);
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
            Wizard
          </Typography>
          <CircularProgress size={25} />
        </Box>
      );
    }
    return (
      <Dialog
        open={true}
        PaperProps={{
          sx: {
            margin: "auto",
            maxWidth: 400,
            textAlign: "center",
            padding: 2,
          },
        }}
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
          <h1>{loginAlert ? `Welcome, ${loginAlert}!` : 'Problem to get user'}</h1>
      </div>
    )  
  
}
