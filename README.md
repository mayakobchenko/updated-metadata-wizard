Goal of this project:
to make the wizard to be a user friendly representation of the KG editor

to start the wizard in dev mode:

```
$ cd updated-metadata-wizard
$ npm run dev
$ cd server
$ npm run server
```

Development notes:

$ node -v
node version is used 22.14.0

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

---

Started the project following: https://react.dev/learn/build-a-react-app-from-scratch

```
npm create vite@latest updated-metadata-wizard -- --template react
cd updated-metadata-wizard
npm install
npm run dev
```

Started express server following: https://github.com/szymmis/vite-express?tab=readme-ov-file#-installation--usage

```
npm add express vite-express
```

```
cd server
node index.js
```

```
$headers = @{"Content-Type" = "application/json"}
$body = @{
event = "post json to backend"
data = @{test = "hello from frontend"}
}
$jsonBody = $body | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:4000/testpost" -Method POST -Headers $headers -Body $jsonBody
```

```
$ npm add winston
$ npm add dotenv
$ npm add react-router-dom
$ npm add antd
$ npm install react-jsonschema-form --save
$ npm install @rjsf/core @rjsf/utils @rjsf/validator-ajv8 --save
```

routes: https://www.w3schools.com/react/showreact.asp?filename=demo2_react_router

use context for state management: https://react.dev/learn/passing-data-deeply-with-context

json schema: https://rjsf-team.github.io/react-jsonschema-form/docs/

firefox error message: index.css -moz-osx-font-smoothing: grayscale;

```
$ npm install concurrently --save-dev
$ npm run server
```

Change vite.config.js add proxy to forward all requests to the backend express server

The app is running on separate ports during development (to leverage each of their separate tools) and possibly serve React from Express in production.

Development:

Run React (e.g., Vite) on its development server for fast reloading and debugging improvements.
Use tools like proxy configurations in Vite's vite.config.js to handle API routes without worrying about CORS issues during development.

Production:

Build the React app into static files and serve these from your Express server. Deploy Express on a single origin so that your API and static assets run under the same domain, reducing CORS complexities.

after setting up proxy type in PowerShell to test:

```
$headers = @{"Content-Type" = "application/json"}
$body = @{
event = "post json to backend"
data = @{test = "proxy test hello from frontend"}}
$jsonBody = $body | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:5173/api/submit-metadata" -Method POST -Headers $headers -Body $jsonBody
```

react json form:
https://rjsf-team.github.io/react-jsonschema-form/docs/api-reference/form-props/

https://firefox-source-docs.mozilla.org/devtools-user/debugger/how_to/use_a_source_map/index.html

test api/testpoint:

$headers = @{"Content-Type" = "application/json"}

```
$body = @{
event = "post json to backend"
data = @{test = "hello from frontend"}}
$jsonBody = $body | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:5174/api/testpost" -Method POST -Headers $headers -Body $jsonBody
```

to test the submit data route in browser:
http://localhost:5174/api/hello

to test the auth route in browser:
http://localhost:5174/api/auth/hello

```
$ npm list react
$ npnm list vite
$ npm list antd
```

antd 5 is not compatible with react 19

```
$ npm install @ant-design/v5-patch-for-react-19 --save
```

use: import '@ant-design/v5-patch-for-react-19';

Redirect url is assigned when configuring the OIDC client. Possible programmatically or in the collab gui. It is possible to set many redirect urls, also for localhost.

To serve the react app to a defined port:

// vite.config.js
import { defineConfig } from 'vite';
export default defineConfig({
server: {
port: parseInt(process.env.VITE_PORT) || 3000, // Default to port 3000 if VITE_PORT is not set
},
});

or change the package.json
{
"scripts": {
"dev": "PORT=3000 vite"
}
}

to start the wizard in dev mode:

```
$ cd updated-metadata-wizard
$ npm run dev
$ cd server
$ npm run server
```

To find out about IP:
$ ipconfig
Wireless LAN adapter IPv4 Address

Command Promt as administrator:
$ netstat -ano | findstr :8080
to identify task:
$ tasklist | findstr 52369
to kill:
$ taskkill /PID <PID> /F

openSSL command promt as admin:
in cert folder:
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout key.pem -out cert.pem
Common Name (CN) in the certificate matches the domain or IP (such as localhost or 127.0.0.1)
press continue in browser

submit button:
https://rjsf-team.github.io/react-jsonschema-form/docs/api-reference/form-props/

docs about auth:
https://wiki.ebrains.eu/bin/view/Collabs/the-collaboratory/Documentation%20IAM/FAQ/OIDC%20Clients%20explained/Authenticating%20with%20your%20OIDC%20client%20and%20fetching%20collab%20user%20info/#HAuthenticationflow

discussion with Eivind about openminds:
https://github.com/openMetadataInitiative/openMINDS_core/blob/v4/schemas/actors/person.schema.tpl.json
controlled terms:
https://github.com/openMetadataInitiative/openMINDS_controlledTerms/tree/v1/schemas
https://github.com/openMetadataInitiative/openMINDS_instances/tree/main/instances/latest/terminologies

standard modes:
https://developer.mozilla.org/en-US/docs/Web/HTML/Quirks_Mode_and_Standards_Mode?utm_source=mozilla&utm_medium=firefox-console-errors&utm_campaign=default

avoid race conditions with useEffect:
https://react.dev/reference/react/useEffect#fetching-data-with-effects

reducer: https://react.dev/learn/extracting-state-logic-into-a-reducer
https://react.dev/learn/scaling-up-with-reducer-and-context

Arda: Selenium or probably Playwright for the web app testing

https://react.dev/learn/reusing-logic-with-custom-hooks

useEffect: https://react.dev/reference/react/useEffect#fetching-data-with-effects

https://react.dev/learn/reusing-logic-with-custom-hooks

race condition:
https://maxrozen.com/race-conditions-fetching-data-react-with-useeffect

npm install @mui/material @emotion/react @emotion/styled

Same Origin Policy CORS issue was fixed by a workaround - fetching user info from the KG endpoint
Otherwise, indicate explicitly the app url while creating a client to allow for CORS

Swagger for KG endpoints:
https://core.kg.ebrains.eu/swagger-ui/index.html

ebrains technical support chat: https://chat.ebrains.eu/channel/tech-support
