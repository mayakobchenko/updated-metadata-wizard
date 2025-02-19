# updated-metadata-wizard

rewriting wizard, node version v22.14.0

nvm install lts
nvm use lts
npm init
npm install react react-dom
npm install redux react-redux

npm install --save-dev webpack webpack-cli webpack-dev-server babel-loader @babel/core @babel/preset-env @babel/preset-react html-webpack-plugin

Create a webpack.config.js file in the root of your project directory
Create a .babelrc file to setup Babel presets:

Create the following directories and files:
your-project/
├── dist/
├── src/
│ ├── index.js
│ └── index.html
├── package.json
├── webpack.config.js
└── .babelrc

Add a start script in your package.json:
"scripts": {
"start": "webpack serve --mode development --open",
"build": "webpack --mode production"
}
To start the React application, run:
npm start

delete dist folder
npx webpack --config webpack.config.js
npx webpack serve

npm list react
npm list react-dom
