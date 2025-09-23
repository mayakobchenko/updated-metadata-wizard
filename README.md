Goal of this project:
to make the wizard to be a user friendly representation of the KG editor

to start the wizard in dev mode:

```
$ cd updated-metadata-wizard
$ npm run dev
$ cd server
$ npm run server
```

view ports in use: netstat -ano

Try with ticket number:

https://127.0.0.1:8080/?TicketNumber=4825517

https://127.0.0.1:8080/?TicketNumber=4824225

https://support.humanbrainproject.eu/#ticket/zoom/24265

collab link in the ticket:
https://support.humanbrainproject.eu/#ticket/zoom/24398

API endpoints:

```
https://api.nettskjema.no/v3/swagger-ui/index.html
https://core.kg.ebrains.eu/swagger-ui/index.html
```

Data proxy api:

```
https://data-proxy.ebrains.eu/api/docs
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

relevant matlab codes from Eivind:
https://github.com/Neural-Systems-at-UIO/SHAREbrain/tree/main?tab=readme-ov-file

currently used wizard:
https://github.com/HumanBrainProject/ebrains_wizard/wiki/Templates
https://github.com/HumanBrainProject/ebrains_wizard/wiki/Templates#source-schemas
https://github.com/HumanBrainProject/ebrains_wizard

swagger:
https://core.kg.ebrains.eu/swagger-ui/index.html
released
https://openminds.ebrains.eu/controlledTerms/BiologicalSex
space: controlled
https://core.kg.ebrains.eu/v3/instances?stage=RELEASED&type=https%3A%2F%2Fopenminds.ebrains.eu%2FcontrolledTerms%2FBiologicalSex&space=controlled

jupiter notebooks:
https://wiki.ebrains.eu/bin/view/Collabs/curation-workflow/data-sharing-collab/upload-wizard-metadata

Matlab package that is updated via github actions when openminds is updated - Eivind:
https://github.com/openMetadataInitiative/openMINDS_MATLAB

https://github.com/Neural-Systems-at-UIO/SHAREbrain/tree/main?tab=readme-ov-file

matlab addon: openminds package install
p = openminds.core.Person()
p.familyName = "Eivind"
C = openminds.collection(p)
p.contactInformation = openminds.core.ContactInformation('email', 'eivihe@uio.no')
C.save('test.json')

myspace preprod
editor
Swagger instance payload example
{
"@type": "https://openminds.ebrains.eu/core/Person",
"https://openminds.ebrains.eu/vocab/familyName": "Eivind"
}

subjects:
https://github.com/ehennestad/openMINDS-MATLAB-GUI

css:
https://internetingishard.netlify.app/html-and-css/advanced-positioning/

some codes and help pages:
https://drive.ebrains.eu/library/f5cf4964-f095-49bd-8c34-e4ffda05a497/Data%20Curation/

https://127.0.0.1:8080/?TicketNumber=12345

https://127.0.0.1:8080/?TicketNumber=4825517

add read me following rules here:
code metafile https://github.com/Neural-Systems-at-UIO/LocaliZoom/blob/master/codemeta.json

code meta file, licence MIT
fork old wizard and new wizard to NeSyS

Eszter: keywords can be added as any other property, so there is no separate endpoint. However, the tricky thing with keywords is that a long list of schemas can be linked as a keyword:
Regarding documentation, there is https://docs.kg.ebrains.eu/ that I know of apart from the swagger. If there is anything else, Oliver can point you to it.

Maja discussion:
in the wizard
prefill from nettskjema contact person
check with curator about ebrains account
short title
authors, contributors
affiliations
search in the dropdown for persons from KG
added new person should be controlled by curators first
corresponding author should be prefilled from the custodian

data descritor formating is compatible to nature scientific

data descriptor
summary keep
version specification keep

data records in the data descriptor
check with Eszter adn Eivind if there is already any script for automatic prefil

prefill all we discussed with Maja to wizard and concentrate on subjects

subjects https://rodentworkbench.apps.ebrains.eu/
Harry's code:
https://github.com/Neural-Systems-at-UIO/RB-workbench

https://rodentworkbench.apps.ebrains.eu/
https://github.com/Neural-Systems-at-UIO/RB-workbench/tree/main

Notes:
what to do? should I do anything about it?
This ticket has authomatic fail delivery message and got duplicates:s
https://127.0.0.1:8080/?TicketNumber=4824591
ticket id: [ 26032, 24631 ]

npm install uuid


talk to Arda:
dump the send_jsonto_openminds.py in the same dir and copy alongside in the dockerfile
have Python available for executing scripts via exec() or spawn()
a docker file eample is in INCF folder 
and a server.js example is also there
use python endpoint for my node server

Ebrains UI components:
https://design-dev.ebrains.eu/ui-components/
https://handbook.ebrains.eu/docs/about-handbook/markdown-guide/

usefull notes websites for developers from Sharon:
https://docs.google.com/document/d/1EWAW2a4momcXVuZbDl7bXcSemYV4IAWtqZvFMvCMFGg/edit?tab=t.0

Ingvild's ticket for info:
 https://support.humanbrainproject.eu/#ticket/zoom/26128

https://127.0.0.1:8080/?TicketNumber=4826087


my test nettskjema: 37885045

my test ticket for testing email sender: 4824171
https://support.humanbrainproject.eu/#ticket/zoom/24211

use this one:
https://127.0.0.1:8080/?TicketNumber=4824171

EBRAINS Curation Request Accepted (Ref. 34057576)
Data Sharing Collab: https://wiki.ebrains.eu/bin/view/Collabs/d-724d4af0-fe28-4032-8837-120b0d64a81c/
Dataset Working Title: Maya's test collab 
ticket 4826029
https://127.0.0.1:8080/?TicketNumber=4826029
https://support.humanbrainproject.eu/#ticket/zoom/26070


zammad search api: /api/v1/tickets/search?query={search word}
"article_ids":[116694]
https://docs.zammad.org/en/latest/api/ticket/articles.html
/api/v1/ticket_articles/{article id}

fork to nesys
service metafile (ask andrew)
read me -> rules

matomo, add code to github repo -> from Arda

what is hash code? 

discussion with curators:

json version keep in the drive

data descriptor questions :
https://gitlab.ebrains.eu/kanban/curators/ebrains-curation-team/-/issues/144

uplading only the last version of the json to KG. Using user's credentials!


about harry's workbench:
https://docker-registry.ebrains.eu/harbor/projects/99/repositories/workbench
https://github.com/Neural-Systems-at-UIO/RB-workbench/tree/main/src%2Fmetadata
Hi Maya, the previous metadata tab in the workbench is not compatible with knowledge graph

download image and try to run in docker desktop

to implement:
additional json file with suggestions of new persons , strains etc 

subjects: default value based on the previous entry

how to get personal token for ebrains account:
https://wiki.ebrains.eu/bin/view/Collabs/the-collaboratory/Documentation%20IAM/FAQ/OIDC%20Clients%20explained/How%20Bearer%20Access%20Token%20works/

refocus: to deploy before 13 of october
discuss with eivind about matlab package, notebook from him and content types 

Eszter:
For working with the drive, you can either use this package: https://github.com/HumanBrainProject/ebrains-storage or the SeaFile API directly via https://drive.ebrains.eu/api2/{endpoint} e.g. https://drive.ebrains.eu/api2/account/info/ (ref here: https://seafile-api.readme.io/reference/introduction). I don't think there is a swagger. There is also a client at https://www.seafile.com/en/download/ (haven't tried this).
You can also carry out file operations directly from a Jupyter cell using shell commands, e.g. %ls my_folder, depending on what you are trying to do. (What are you working on?)

Eszter, could you send me this gitlab link to discriptor questions? and the subject code?
https://gitlab.ebrains.eu/kanban/curators/ebrains-curation-team/-/issues/144
Regarding subjects, here is one of my scripts that maybe has code you would find useful:
find it in extra_info folder/subjects_Eszter.py
What I did here is to create a mini template for subjects and subject states based on example instances in the KG, and then filled it out based on files from the data provider, and uploaded it.

Hi Maya, I have checked the Nettskjema issue that we got a support ticket about (base URL change, we looked at the ticket yesterday during the curation meeting, if you remember). It seems that the base URL was already up to date in my scripts (https://wiki.ebrains.eu/bin/view/Collabs/curation-workflow/Drive#Nettskjema). I have found the old base URL in Eivind's client and updated that (https://wiki.ebrains.eu/bin/view/Collabs/curation-workflow/Drive#Data-Sharing-Collab-Scripts/src/dsc/web_service/nettskjema). I wonder if you may have any code running that still uses the old URL? Could you please check?

For context, here is the related GitLab issue: https://gitlab.ebrains.eu/kanban/curators/ebrains-curation-team/-/issues/190
https://www.uio.no/tjenester/it/adm-app/nettskjema/hjelp/api-clients-v3.md
https://nettskjema.no/api/v3/swagger-ui/index.html
api.nettskjema.no/v3/  ->  nettskjema.no/api/v3/

new availabale endpoitn for nettskjema: 
/form/{formId}/answers
/form/{formId}/submission-metadata
/form/{formId}/submission-metadata-postponed

how to fetch user token:
https://wiki.ebrains.eu/bin/view/Collabs/the-collaboratory/Documentation%20IAM/FAQ/OIDC%20Clients%20explained/How%20Bearer%20Access%20Token%20works/

Note: users have to grant authorizations 
https://wiki.ebrains.eu/bin/view/Collabs/the-collaboratory/Documentation%20IAM/FAQ/OIDC%20Clients%20explained/Authenticating%20with%20your%20OIDC%20client%20and%20fetching%20collab%20user%20info/

Andrew:
Hi Maya. You can access the Drive API endpoints with the standard Javascript Fetch API. The base URL for the EBRAINS Drive API is https://drive.ebrains.eu/api/v2.1/. Note that you will probably run into CORS problems if your app runs in a web browser. We currently work round this by using a proxy (i.e., we preprend the URLs with “https://corsproxy.apps.tc.humanbrainproject.eu/”, so the effective endpoint URL becomes “https://corsproxy.apps.tc.humanbrainproject.eu/https://drive.ebrains.eu/api/v2.1/”.
https://seafile-api.readme.io/reference/introduction
https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API

VM at uio
https://view.uio.no/portal/webclient/#/launchitems

questions:
1. scopes need granted permission from user. how to test? 


managing oidc clients:
https://wiki.ebrains.eu/bin/view/Collabs/collaboratory-community-apps/workshop/Community%20App%20Demo


iam end points:
https://iam.ebrains.eu/auth/realms/hbp/.well-known/openid-configuration