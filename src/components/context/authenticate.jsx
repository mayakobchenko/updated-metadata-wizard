const USER_INFO_URL = import.meta.env.VITE_APP_USER_INFO_URL
const userMap = {
    username: 'http://schema.org/alternateName',
    fullname: 'http://schema.org/name',
    email: 'http://schema.org/email'
};
const authFunctions = {
login: async function login () {
    //console.log('login redirecting to IAM service')
    const urlParams = new URLSearchParams(window.location.search);
    try {
        let url = 'api/auth/loginurl'  
        url += '?' + urlParams.toString();
        const urlResponse = await fetch(url)
        if (!urlResponse.ok) {
            throw new Error(`Failed to fetch IAM link from backend: ${urlResponse.status}`);
        }
        window.location.href = await urlResponse.text();
    } catch (error) {
        throw new Error ('Error occurred while logging in:', error.message)
    }
},

authenticate: async function authenticate() {
    console.log('authenticate redirecting to IAM service')
    const urlParams = new URLSearchParams(window.location.search);
    let url = 'api/auth/requesturl'
    url += '?' + urlParams.toString();   
    try {
        const urlResponse = await fetch(url)
        if (!urlResponse.ok) {
            throw new Error(`Failed to get IAM url from backend, status: ${urlResponse.status}`);
        }
        window.location.href = await urlResponse.text();
    } catch (error) {
        throw new Error(`Could not fetch IAM url: ${error.message}`);
    }
},

logout: async function logout() {
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
},

getToken: async function getToken() {
    const urlParams = new URLSearchParams(window.location.search);
    let url = 'api/auth/token'
    url += '?' + urlParams.toString();
    try {
      const tokenResponse = await fetch(url)
      if (!tokenResponse.ok) {
        throw new Error(`Failed to fetch token from backend: ${tokenResponse.status}`);
      }
      return tokenResponse.text();
    } catch (error) {
      console.error('Error occurred while fetching token from backend:', error.message);
    }
},

getUser: async function getUser(token) {
    const url = 'api/auth/user';  
    try {
      const userResponse = await fetch(url, {headers: {authorization: token, 'Content-Type': 'application/json'}});
      if (!userResponse.ok) {
        throw new Error(`Failed to get user, status: ${userResponse.status}`);
      }
      const data = await userResponse.json();  
      console.log(data);
      return data;
    } catch (error) {console.error('Error fetching user from backend:', error.message);
  }
},
getUserKG: async function getUserKG(token) {
    try {
        const userResponse = await fetch(`${USER_INFO_URL}`, {headers: {authorization: token, 'Content-Type': 'application/json'}});
        if (!userResponse.ok) {
          throw new Error(`Failed to get user, status: ${userResponse.status}`);
        }
        const responseData = await userResponse.json(); 
        const data = responseData.data;
        let userInfo = {};
        Object.keys(userMap).forEach(key => {
            userInfo[key] = data[userMap[key]];
        })
        return userInfo;
    } 
    catch (error) {console.error('Error fetching user from backend:', error.message)}}
}

export default authFunctions