//Eivind's code to get urls from the backend express server 

async function login() {
    const urlParams = new URLSearchParams(window.location.search);
    try {
        let url = 'api/auth/loginurl'  
        url += '?' + urlParams.toString();
        const urlResponse = await fetch(url)
        if (!urlResponse.ok) {
            throw new Error(`Failed to fetch oidc url from backend: ${urlResponse.status}`);
        }
        window.location.href = await urlResponse.text();
    } catch (error) {
        console.error('Error occurred while logging in:', error.message);
    }
}

async function authenticate() {
    const urlParams = new URLSearchParams(window.location.search);
    let url = 'api/auth/requesturl'
    url += '?' + urlParams.toString();   
    try {
        const urlResponse = await fetch(url)
        if (!urlResponse.ok) {
            throw new Error(`Failed to get auth request url. Status: ${urlResponse.status}`);
        }
        window.location.href = await urlResponse.text();
    } catch (error) {
        console.error('Error occurred while fetching auth request url:', error.message);
    }
}

async function logout() {
    const urlParams = new URLSearchParams(window.location.search);
    try {
        let url = 'api/auth/logouturl'
        url += '?' + urlParams.toString();      
        const logoutResponse = await fetch(url)
        if (!logoutResponse.ok) {
            throw new Error(`Failed to logout. Status: ${logoutResponse.status}`);
        }
        window.location.href = await logoutResponse.text();
    } catch (error) {
        console.error('Error occurred while logging out:', error.message);
    }
}
async function getToken() {
    const urlParams = new URLSearchParams(window.location.search);
    let url = 'api/auth/token'
    url += '?' + urlParams.toString();
    try {
      const tokenResponse = await fetch(url)
      if (!tokenResponse.ok) {
        throw new Error(`Failed to fetch token. Status: ${tokenResponse.status}`);
      }
      return tokenResponse.text();
    } catch (error) {
      console.error('Error occurred while fetching token:', error.message);
    }
}
async function getUser(token) {
    const url = 'api/auth/user';  
    try {
      const response = await fetch(url, {headers: {Authorization: token}});
      if (!response.ok) {
        throw new Error(`Failed to get user. Status: ${response.status}`);
      }
      const data = await response.json();  
      return data;
    } catch (error) {throw error}
  }
export { getToken, login, logout, authenticate, getUser };