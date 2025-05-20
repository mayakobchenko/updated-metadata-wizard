import { useAuth } from "./context/useAuth";
import { useAuthContext } from './context/AuthProviderContext';
import { useState, useEffect } from 'react'
import {Box, CircularProgress, Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions, Button} from "@mui/material"

//const TOKEN_URL = import.meta.env.VITE_TOKEN_ENDPOINT
const OIDC = import.meta.env.VITE_APP_OIDC
const MY_URL = import.meta.env.VITE_APP_MY_URL
const clientId = import.meta.env.VITE_WIZARD_OIDC_CLIENT_ID
//const USER_INFO_URL = import.meta.env.VITE_APP_USER_INFO_URL

const handleLogin = () => {
  window.location.href = `${OIDC}?response_type=code&login=true&client_id=${clientId}&redirect_uri=${MY_URL}`;
};

export default function WelcomeText() {
  
  useAuth();
  const userInfo = useAuthContext();
  const [showDialog, setShowDialog] = useState(false);

//Brief timeout for UX qol
  useEffect(() => {
      if (!userInfo.token) {
      const timer = setTimeout(() => setShowDialog(true), 5000);
      return () => clearTimeout(timer);
      } else {
        setShowDialog(false);
      }
  }, [userInfo.token]);

  if (!userInfo.token) {
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
  
}

