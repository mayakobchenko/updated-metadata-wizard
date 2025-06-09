import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

const EBRAINS_IAM_SERVER = "https://iam.ebrains.eu/auth/realms/hbp";
const TOKEN_ENDPOINT = EBRAINS_IAM_SERVER + "/protocol/openid-connect/token";
const AUTH_ENDPOINT = EBRAINS_IAM_SERVER + "/protocol/openid-connect/auth";
const LOGOUT_ENDPOINT = EBRAINS_IAM_SERVER + "/protocol/openid-connect/logout";
const USERINFO_ENDPOINT = EBRAINS_IAM_SERVER + "/protocol/openid-connect/userinfo";

const router = express.Router();

router.get('/loginurl', getLoginUrl)
router.get('/logouturl', getLogOutUrl)
router.get('/requesturl', getAuthRequestUrl);
router.get('/user', getUser)
router.get('/token', getToken);

//to test the auth route: 
router.get('/hello', helloAuth);
async function helloAuth (req, res) {
  res.json({ message: 'Hello from auth route' });
  console.log(`${req.method} ${req.url}`);
}

async function getLoginUrl(req, res) {
  try {
    const clientId = process.env.WIZARD_OIDC_CLIENT_ID;
    //let redirectUrl = process.env.WIZARD_OIDC_CLIENT_REDIRECT_URL;
    //window.location.href = `${OIDC}?response_type=code&login=true&client_id=${clientId}&redirect_uri=${MY_URL}`
    let redirectUrl = 'https://127.00.0.1:8080/';
    if (!redirectUrl || !clientId) {
      throw new Error('Missing required login parameters.');
    }
    if (req.query && Object.keys(req.query).length > 0) {
      delete req.query.iss
      const searchParamString = new URLSearchParams(req.query).toString()
      if (searchParamString) {
        redirectUrl += '?' + searchParamString
      }
    }
    const params = new URLSearchParams({
      login: 'true',
      response_type: 'code',
      client_id: clientId,
      scope: 'openid',
      redirect_uri: redirectUrl,
    });    
    res.status(200).send(AUTH_ENDPOINT + '?' + params.toString());
  } catch (error) {
    console.error('Error fetching IAM url from login endpoint', error.message);
    res.status(500).send('Internal server error');
  }
}

async function getAuthRequestUrl(req, res) {
  try {
    const clientId = process.env.WIZARD_OIDC_CLIENT_ID;
    //let redirectUrl = process.env.WIZARD_OIDC_CLIENT_REDIRECT_URL;
    let redirectUrl = 'https://127.00.0.1:8080/';
    if (!redirectUrl || !clientId) {
      throw new Error('Missing required parameters.');
    }
    if (req.query && Object.keys(req.query).length > 0) {
          redirectUrl += '?' + new URLSearchParams(req.query).toString();
      }
    const params = new URLSearchParams({
      prompt: 'none',
      login: 'true',
      response_type: 'code',
      client_id: clientId,
      scope: 'openid',
      redirect_uri: redirectUrl,
    });
    res.status(200).send(AUTH_ENDPOINT + '?' + params.toString());
  } catch (error) {
    console.error('Error fetching IAM url from requesturl endpoint:', error.message);
    res.status(500).send('requesturl endpoint express server error');
  }
}

async function getToken(req, res) {
    try {      
      const authorizationCode = req.query.code; 
      //let redirectUrl = process.env.WIZARD_OIDC_CLIENT_REDIRECT_URL;
      let redirectUrl = 'https://127.00.0.1:8080/';
      const clientId = process.env.WIZARD_OIDC_CLIENT_ID;
      const clientSecret = process.env.WIZARD_OIDC_CLIENT_SECRET;
      if (!authorizationCode || !redirectUrl || !clientId || !clientSecret) {
        throw new Error('Missing required parameters.');
      }
      if (req.query && Object.keys(req.query).length > 0) {
        delete req.query.code;
        delete req.query.session_state;
        delete req.query.iss;
        //delete req.query.TicketNumber;
        const searchParamString = new URLSearchParams(req.query).toString();
        if (searchParamString) {
          redirectUrl += '?' + searchParamString;
        }
      }
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: authorizationCode,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUrl,
      });
      console.log('fetching token at backend')
      let requestOptions = {
        method: 'post',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: params.toString()
      };
      const tokenResponse = await fetch(TOKEN_ENDPOINT, requestOptions)
      if (!tokenResponse.ok) {
        throw new Error(`problem fetching token from IAM: ${response.status}`)
      }
      let tokenData = await tokenResponse.json();
      if (tokenData["access_token"]) {
        res.status(tokenResponse.status).send(tokenData["access_token"]);
      } else {
        throw new Error('Could not fetch KG token')
      }
    } catch (error) {
      console.error('Error fetching token from IAM:', error.message)
      //res.status(500).send('Internal server error', error.message);
    }
  }

async function getUser(req, res) {
    try {
      const token = req.headers.authorization
      //console.log('token at server:', token);
      if (!token) {
        throw new Error('Missing required parameters.')
      }
      const userResponse = await fetch(USERINFO_ENDPOINT, {
        headers: { 'Authorization': `Bearer ${token}` }})
      //console.log(userResponse);  
      if (!userResponse.ok) {
        throw new Error(`problem fetching user info: ${response.status}`)
      } 
      const userData = await userResponse.json()
      //console.log(userData);
      if (userData){
        const userInfo = {
          name: userData.name,
          preferred_username: userData.preferred_username,
          given_name: userData.given_name,
          family_name: userData.family_name,
          email: userData.email,
      }
      console.log('user at server:', userInfo)
      res.status(userResponse.status).send(userInfo)
      } else {
        throw new Error('Could not fetch user data');
      }
    } catch (error) {
      console.error('Error occurred while fetching user:', error.message);
      res.status(500).send('Internal server error');
    }
  }

async function getLogOutUrl(req, res) {
    try {
      //let redirectUrl = process.env.WIZARD_OIDC_CLIENT_REDIRECT_URL;
      let redirectUrl = 'https://127.00.0.1:8080/';
      if (!redirectUrl) {
        throw new Error('Missing required parameters.');
      }
      if (req.query && Object.keys(req.query).length > 0) {
        const searchParamString = new URLSearchParams(req.query).toString();
        if (searchParamString) {
          redirectUrl += '?' + searchParamString;
        }
      }
      const params = new URLSearchParams({
        redirect_uri: redirectUrl,
      });
      const logoutUrl = LOGOUT_ENDPOINT + '?' + params.toString();      
      res.status(200).send(logoutUrl);
    } catch (error) {
      console.error('Error occurred while fetching logout url:', error.message);
      res.status(500).send('Internal server error');
    }
  }

export default router;  