import dotenv from 'dotenv'
dotenv.config() //on localhost: dotenv.config({ path: '../../.env' })

export async function getRequestOptions() {
    try{
        const token = await getTokenFromServiceAccount()
        const requestHeader = { 
            Accept: "*/*", 
            Authorization: "Bearer " + token, 
            'User-Agent': "python-requests/2.25.0",
            'Content-Type': 'application/json',
            'Content-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive'
        }    
        console.log(token)
        const requestOptions = {headers: requestHeader}
        return requestOptions
    } catch (error) {
        throw new Error(`getRequestOptions failure: ${error.message}`)
    }
}
        
export async function getTokenFromServiceAccount() {
    const clientId = process.env.WIZARD_OIDC_CLIENT_ID
    const clientSecret = process.env.WIZARD_OIDC_CLIENT_SECRET
    console.log('client id:', clientId)
    
    const endpointURL = "https://iam.ebrains.eu/auth/realms/hbp/protocol/openid-connect/token"
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'openid group roles email profile team'
    })

    //const body = "grant_type=client_credentials&client_id=" + clientId + "&client_secret=" + clientSecret + "&scope=email%20profile%20team%20group"//"&scope=openid%20group%20roles%20email%20profile%20team"
    //const requestOptions = {method: 'post',headers: {'Content-Type': 'application/x-www-form-urlencoded'},body: body}
    
    try {
        const response = await fetch(endpointURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${basic}`},
            body: params.toString()
        })
        //const response = await fetch(endpointURL, requestOptions)
        const text = await response.text()
        let json
        try { json = JSON.parse(text) } catch (e) { json = null }
        
        if (!response.ok) {
            throw new Error(`response from iam: ${response.status}`)}
        //const jsonData = await response.json()
        if (json.access_token) {
            return json.access_token
          } else {
            throw new Error('Client could not fetch KG token')}
    } catch (error) {
        throw new Error(`kgAuthentication.js file throws an error: ${error.message}`)
    }
}


