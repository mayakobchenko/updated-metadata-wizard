# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

---

following: https://react.dev/learn/build-a-react-app-from-scratch

```
npm create vite@latest updated-metadata-wizard -- --template react
cd updated-metadata-wizard
npm install
npm run dev
```

following: https://github.com/szymmis/vite-express?tab=readme-ov-file#-installation--usage

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

## firefox error message: index.css -moz-osx-font-smoothing: grayscale;

---

```
$ npm install concurrently --save-dev
$ npm run server
```

Chang evite.config.js add proxy

The app is running on separate ports during development (to leverage each of their separate tools) and possibly serve React from Express in production.

Development:

Run React (e.g., Vite) on its development server for fast reloading and debugging improvements.
Use tools like proxy configurations in Vite's vite.config.js to handle API routes without worrying about CORS issues during development.

Production:

Build the React app into static files and serve these from your Express server. Deploy Express on a single origin so that your API and static assets run under the same domain, reducing CORS complexities.

after setting up proxy:
$headers = @{"Content-Type" = "application/json"}
$body = @{
event = "post json to backend"
data = @{test = "proxy test hello from frontend"}}
$jsonBody = $body | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:5173/api/submit-metadata" -Method POST -Headers $headers -Body $jsonBody

---

react json form:
https://rjsf-team.github.io/react-jsonschema-form/docs/api-reference/form-props/
