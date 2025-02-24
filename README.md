# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

---

following: https://react.dev/learn/build-a-react-app-from-scratch
npm create vite@latest updated-metadata-wizard -- --template react

cd updated-metadata-wizard
npm install
npm run dev

following: https://github.com/szymmis/vite-express?tab=readme-ov-file#-installation--usage
npm add add express vite-express

---

$headers = @{"Content-Type" = "application/json"}
$body = @{
event = "post json to backend"
data = @{test = "hello from frontend"}
}
$jsonBody = $body | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:5000/api/data" -Method POST -Headers $headers -Body $jsonBody

---

$ npm add winston
$ npm add dotenv
$ npm add react-router-dom
$ npm add antd
$ npm install react-jsonschema-form --save
$ npm install @rjsf/core @rjsf/utils @rjsf/validator-ajv8 --save

routes: https://www.w3schools.com/react/showreact.asp?filename=demo2_react_router

context: https://react.dev/learn/passing-data-deeply-with-context
