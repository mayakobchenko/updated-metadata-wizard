import React, { useEffect, useState } from "react";
import {
  AppBar,
  Button,
  Box,
  CircularProgress,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tabs,
  Tab,
  Toolbar,
  Tooltip,
  Typography,
  Snackbar,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import HelpRoundedIcon from "@mui/icons-material/HelpRounded";
import FindInPageIcon from "@mui/icons-material/FindInPage";
//import HomeRoundedIcon from "@mui/icons-material/HomeRounded";

import Mainframe from "./Mainframe";
import callUser from "../actions/createUser";
import { useTabContext } from "./TabContext";

// Variable loading for URLs
const OIDC = import.meta.env.VITE_APP_OIDC;

// Dev instance switch pain points
const TOKEN_URL = import.meta.env.VITE_APP_TOKEN_URL;
const MY_URL = import.meta.env.VITE_APP_MY_URL;

const tabs = [
  /*
  {
    icon: <HomeRoundedIcon />,
    label: "Projects",
    url: null,
    disabled: false,
  },
  // To be implemented once the project context is ready
  {
  */
  {
    label: "Projects",
    url: null,
    disabled: false,
  },

  {
    label: "WebAlign",
    url: "https://webalign.apps.ebrains.eu/index.php",
    disabled: false,
  },
  {
    label: "WebWarp",
    url: "https://webwarp.apps.ebrains.eu/webwarp.php",
    disabled: false,
  },
  {
    label: "WebIlastik",
    url: "https://app.ilastik.org/public/nehuba/index.html#!%7B%22layout%22:%22xy%22%7D",
    disabled: false,
  },
  {
    label: "WebNutil",
    url: null,
    disabled: false,
  },
  {
    label: "Sandbox",
    url: null,
    disabled: true,
  },
];

console.log(`You are running this application in ${process.env.NODE_ENV} mode`);

console.log(`Logging in`);

const Header = () => {
  const [auth, setAuth] = useState(false);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Control for the iframe, further divergence from an iframe can be done within the Mainframe component
  // Mainly for Native use of the applications and the webalign etc i frame ones
  const {
    currentTab,
    switchToTab,
    navigateToWebAlign,
    navigateToWebWarp,
    nativeSelection,
    setNativeSelection,
    currentUrl,
    handleFrameChange,
  } = useTabContext();
  const [docsOpen, setDocsOpen] = useState(false);

  // Login alert
  const [loginAlert, setLoginAlert] = useState(true);
  const [showDialog, setShowDialog] = useState(false);

  // Tab context to interact

  const handleLogin = () => {
    window.location.href = `${OIDC}?response_type=code&login=true&client_id=quintweb&redirect_uri=${MY_URL}`;
    // WIP url https://rodentworkbench.apps.ebrains.eu/new/
  };

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const toggleDocs = () => {
    setDocsOpen(!docsOpen);
  };

  const sharedListItemSx = {
    "&:hover": {
      backgroundColor: "rgba(0, 0, 0, 0.04)",
      cursor: "pointer",
    },
  };

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

  // Get user on mount, always renews on new token
  useEffect(() => {
    const fetchUser = async () => {
      if (!token) return;

      try {
        const userInfo = await callUser(token);
        setUser(userInfo);
        console.log(userInfo);
        localStorage.setItem("userInfo", JSON.stringify(userInfo));
        setAuth(true);
      } catch (error) {
        console.error("User couldn't be retrieved", error);
        setAuth(false);
        setUser(null);
      }
    };

    fetchUser();
  }, [token]);

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
          }}
        >
          <Typography variant="body" fontSize={20} color="text.primary" mb={15}>
            Rodent Workbench
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
        <DialogTitle>Welcome to Rodent Workbench</DialogTitle>
        <DialogContent>
          <Typography>
            Please login to access the Rodent Workbench and the EBrains
            services.
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
    <Box
      sx={{
        flexGrow: 1,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <AppBar
        position="flex"
        sx={{
          backgroundColor: "#f0f0f0",
          color: "black",
          boxShadow: "none",
        }}
      >
        <Toolbar
          variant="dense"
          sx={{
            minHeight: "36px !important",
            py: 0,
            px: 1,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              width: "100%",
            }}
          >
            <Tabs
              value={currentTab}
              onChange={(event, newValue) => switchToTab(newValue)}
              sx={{
                minHeight: "36px",
                "& .MuiTab-root": {
                  minHeight: "36px",
                  fontSize: "0.875rem",
                  padding: "0 16px",
                  minWidth: "auto",
                  opacity: 0.7,
                  transition: "opacity 0.1s",
                  color: "black",
                  textTransform: "none",
                  backgroundColor: "#e0e0e0",
                  clipPath:
                    "polygon(90% 0, 100% 50%, 90% 100%, 0 100%, 10% 50%, 0 0)", // Arrow shape
                  marginLeft: -0.5, // Spacing is 0 for now as arrows look to be fitting in
                  "&:first-child": {
                    clipPath:
                      "polygon(90% 0, 100% 50%, 90% 100%, 0 100%, 0 0, 0 0)", // First tab shape with normal left edge
                    borderRadius: "2px",
                    marginLeft: -0.5,
                  },
                  "&.Mui-selected": {
                    color: "white",
                    opacity: 1,
                    backgroundColor: "primary.main", // Selected tab background
                  },
                  "&:hover": {
                    opacity: 1,
                    backgroundColor: "darkgray",
                  },
                },
                "& .MuiTabs-indicator": {
                  display: "none",
                },
              }}
            >
              {tabs.map((tab, index) => (
                <Tab
                  key={index}
                  label={tab.icon || tab.label}
                  disabled={!token && tab.label !== "Projects"}
                  onClick={() => {
                    switch (tab.label) {
                      case "Projects":
                        setNativeSelection({
                          native: true,
                          app: "workspace",
                        });
                        break;
                      case "WebAlign":
                        navigateToWebAlign();
                        break;
                      case "WebWarp":
                        navigateToWebWarp();
                        break;
                      case "WebNutil": {
                        setNativeSelection({
                          native: true,
                          app: "nutil",
                        });
                        console.log(nativeSelection);
                        break;
                      }
                      case "Sandbox":
                        setNativeSelection({
                          native: true,
                          app: "results",
                        });
                        break;
                      default:
                        handleFrameChange(tab.url);
                    }
                  }}
                />
              ))}
            </Tabs>
          </Box>

          <Box
            sx={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 1,
              display: "flex",
              flexDirection: "row",
            }}
          >
            <Typography
              sx={{
                fontSize: "0.875rem",
              }}
            >
              rodent workbench
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              position: "absolute",
              flexDirection: "row",
              right: 0,
              mr: 2,
            }}
          >
            <Tooltip title="Docs">
              <IconButton
                onClick={toggleDocs}
                size="small"
                sx={{
                  color: "black",
                  padding: 0,
                  "&:hover": {
                    backgroundColor: "transparent",
                  },
                  mr: 1,
                }}
              >
                <FindInPageIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Account, settings and FAQ">
              <Button
                onClick={user ? toggleDrawer : handleLogin}
                sx={{
                  textAlign: "right",
                  cursor: "pointer",
                  fontWeight: "bold",
                  color: "text.primary",
                  textTransform: "none", // Prevents default button text uppercase
                  padding: 0,
                  "& .MuiTypography-root": {
                    variant: "body2",
                  },
                }}
              >
                {user?.username || "Login"}
              </Button>
            </Tooltip>
          </Box>
        </Toolbar>
        <Drawer anchor="right" open={drawerOpen} onClose={toggleDrawer}>
          <Box
            sx={{
              width: 280,
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
            role="presentation"
          >
            <List>
              <ListItem sx={sharedListItemSx}>
                <ListItemIcon>
                  <AccountCircleIcon />
                </ListItemIcon>
                {
                  <ListItemText
                    primary={user?.fullname}
                    secondary={user?.email}
                    primaryTypographyProps={{
                      variant: "body2",
                      color: "text.primary",
                    }}
                  />
                }
              </ListItem>
              <ListItem sx={sharedListItemSx}>
                <ListItemIcon>
                  <CloudDownloadIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Download Example Dataset"
                  primaryTypographyProps={{
                    variant: "body2",
                    color: "text.primary",
                  }}
                />
              </ListItem>
              <ListItem
                sx={sharedListItemSx}
                onClick={() =>
                  window.open("https://www.ebrains.eu/contact/", "_blank")
                }
              >
                <ListItemIcon>
                  <HelpRoundedIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Contact Us"
                  primaryTypographyProps={{
                    variant: "body2",
                    color: "text.primary",
                  }}
                />
              </ListItem>
              <ListItem sx={sharedListItemSx} onClick={() => handleLogin()}>
                <ListItemText primary="Login again" />
              </ListItem>
            </List>
            <Box sx={{ padding: "16px", marginTop: "auto" }}>
              <Typography variant="body2" color="textSecondary">
                Rodent Workbench v1.0.0, UiO 2024
              </Typography>
            </Box>
          </Box>
        </Drawer>
      </AppBar>
      <Dialog
        open={docsOpen}
        onClose={toggleDocs}
        maxWidth={false}
        PaperProps={{
          sx: {
            right: 0,
            m: 0,
            height: "100%",
            width: "50%",
            borderRadius: 0,
            transition: "transform 0.3s ease-in-out",
            transform: docsOpen ? "translateX(0)" : "translateX(100%)",
          },
        }}
      >
        <iframe
          src="https://quint-webtools.readthedocs.io/en/latest/"
          style={{ width: "100%", height: "100%", border: "none" }}
          title="Rodent Workbench Documentation"
        />
      </Dialog>
      <Mainframe
        url={currentUrl}
        native={nativeSelection}
        token={token}
        user={user}
      />
      <Snackbar
        open={loginAlert}
        autoHideDuration={5000}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="info" sx={{ width: "100%" }} elevation={6}>
          Please login to access the Rodent Workbench and the EBrains services
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Header;