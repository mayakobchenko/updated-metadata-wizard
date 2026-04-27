let access_token = ''
let access_token_exp = 0
let refresh_token = ''
let refresh_token_exp = 0
let working_token = ''
let client_id = ''
let client_secret = ''
const TOKEN_ENDPOINT= "https://iam.ebrains.eu/auth/realms/hbp/protocol/openid-connect/token"

const tokenFunctions = {

    setAccessToken: function setAccessToken(clientId, clientSecret, newAccessToken, expiresIn, refresh, refresh_exp) {
        access_token = newAccessToken
        //console.log('accesstoken:', access_token)
        access_token_exp = Date.now() + expiresIn * 1000
        //console.log('token expires in:', access_token_exp)
        refresh_token = refresh
        refresh_token_exp = Date.now() + refresh_exp * 1000
        client_id = clientId
        client_secret = clientSecret
    },

    isTokenExpired: function isTokenExpired() {
        return Date.now() >= access_token_exp
    },

    isRefreshExpired: function isRefreshExpired() {
        return Date.now() >= refresh_token_exp
    },
        
    getAccessToken: function getAccessToken() {
        return access_token
    },

    getRefreshToken: function getRefreshToken() {
        return refresh_token
    },

    getWorkingToken: async function getWorkingToken() {
        if (!access_token || tokenFunctions.isTokenExpired()) {
            console.log('Token expired or not available. Fetching a new token...')
            if (!tokenFunctions.isRefreshExpired()) {
            const params = new URLSearchParams({
                grant_type: 'refresh_token',  
                refresh_token: refresh_token, 
                client_id: client_id,
                client_secret: client_secret,})
            const requestOptions = {
                method: 'post',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: params.toString()}
            try {
                const tokenResponse = await fetch(TOKEN_ENDPOINT, requestOptions)
                if (!tokenResponse.ok) {
                    throw new Error(`problem fetching working token from IAM: ${tokenResponse.status}`)}
                const tokenData = await tokenResponse.json()
                //console.log(tokenData)
                working_token = tokenData["access_token"]
            } catch (error) {
                //implement page reload here in case refresh token expires
                console.error('Error fetching working token from IAM:', error.message)}
            } else {console.log('refresh token expired, reload the page')}
        } else {
            working_token = access_token
        } 
        return working_token
    },


}

export default tokenFunctions