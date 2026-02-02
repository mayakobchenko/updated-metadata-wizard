async function getToken(req, res) {
  const controller = new AbortController();
  const { signal } = controller;

  const onClose = () => {
    console.warn('Client disconnected, aborting request to iam');
    controller.abort();
  };
  req.on('close', onClose);

  try {
    const authorizationCode = req.query.code;
    let redirectUrl = 'https://127.00.0.1:8080/';
    const clientId = process.env.WIZARD_OIDC_CLIENT_ID;
    const clientSecret = process.env.WIZARD_OIDC_CLIENT_SECRET;

    if (!authorizationCode || !redirectUrl || !clientId || !clientSecret) {
      throw new Error('Missing required parameters.');
    }

    // rebuild redirectUrl preserving other query params
    if (req.query && Object.keys(req.query).length > 0) {
      delete req.query.code;
      delete req.query.session_state;
      delete req.query.iss;
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

    console.log('fetching token at backend (outbound fetch to IAM)');

    const tokenRequestOptions = {
      method: 'post',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      signal
    };

    // Retry token fetch up to 3 times with exponential backoff
    const tokenResponse = await retryFetch(TOKEN_ENDPOINT, tokenRequestOptions, 3, 500);
    const text = await tokenResponse.text().catch(() => null);

    const tokenData = text ? JSON.parse(text) : null;
    if (!tokenData) {
      throw new Error('Could not fetch personal token');
    }

    console.log('token expires in:', tokenData["expires_in"]);
    const expiresIn = tokenData.expires_in;
    const refresh_token = tokenData.refresh_token;
    const refresh_token_exp = tokenData.refresh_expires_in;
    const access_token = tokenData["access_token"];

    tokenFunctions.setAccessToken(clientId, clientSecret, access_token, expiresIn, refresh_token, refresh_token_exp);

    console.log('outbound fetch for userinfo');

    const userRequestOptions = {
      method: 'get',
      headers: {
        authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      signal
    };

    // Retry user fetch separately (also up to 3 attempts)
    const userResponse = await retryFetch(USER_INFO_URL, userRequestOptions, 3, 500);

    // If retryFetch returned, the response is OK
    const responseData = await userResponse.json();
    const data = responseData.data;

    let userInfo = {};
    Object.keys(userMap).forEach(key => {
      userInfo[key] = data[userMap[key]];
    });

    console.log('user info from KG endpoint:', userInfo);

    res.status(userResponse.status).send(userInfo);

  } catch (error) {
    if (error && error.name === 'AbortError') {
      console.log('Outbound token fetch aborted due to client disconnect.');
      if (!res.headersSent) {
        try { res.status(499).end(); } catch (e) { /* ignore */ }
      }
      return;
    }

    console.error('Error fetching personal token from IAM:', error && error.message ? error.message : error);

    // If retryFetch produced a HTTP status in the error object you might want to forward it
    if (!res.headersSent) {
      if (error && error.status && (error.status >= 400 && error.status < 600)) {
        // map 5xx to 502, 4xx to 400/401/403 etc as appropriate
        if (error.status >= 500) return res.status(502).send({ error: 'Failed to fetch token from IAM', details: error.body || error.message });
        return res.status(error.status).send({ error: 'IAM error', details: error.body || error.message });
      }
      return res.status(500).send('Backend server error');
    }
  } finally {
    req.off('close', onClose);
  }
}
