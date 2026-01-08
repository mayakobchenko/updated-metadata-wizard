// WelcomeText.jsx
import React, { useState, useEffect } from 'react';
import { useAuthContext, useAuthActions } from './context/AuthProviderContext';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';
import LoadingSpinner from './LoadingSpinner';

export default function WelcomeText() {
  const { token, user, isAuthenticating } = useAuthContext();
  const { login } = useAuthActions(); // used to trigger login flow or call authFunctions.login
  const [showDialog, setShowDialog] = useState(false);

  // If you want to show dialog only after a short delay (UX)
  useEffect(() => {
    if (!token) {
      const t = setTimeout(() => setShowDialog(true), 5000);
      return () => clearTimeout(t);
    } else {
      setShowDialog(false);
    }
  }, [token]);

  function handleLogin() {
    // If you use external authFunctions, call it here or call login(token) after redirect flow
    // Example: authFunctions.login() which will eventually store token and provider will verify
    // import authFunctions and call here if needed:
    // authFunctions.login()
    // or call login() if using provider login helper that accepts token
    // For now, call the external flow:
    // authFunctions.login()
    // If your login is redirect-based you won't return here anyway.
    // If you support programmatic login you could call login(token)
    window.location.href = '/login'; // replace with your login flow
  }

  if (!token && !showDialog) {
    // show spinner while waiting for possibility of dialog; you can choose different UX
    return <LoadingSpinner />;
  }

  if (!token && showDialog) {
    return (
      <Dialog open>
        <DialogTitle>Welcome to the Ebrains Metadata Wizard</DialogTitle>
        <DialogContent>
          <Typography>Please login with your Ebrains account.</Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={handleLogin}>Login</Button>
        </DialogActions>
      </Dialog>
    );
  }

  // When token exists, optionally render nothing or greetings
  return null;
}
