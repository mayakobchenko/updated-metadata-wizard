import './App.css'
import PrivacyBanner from './components/PrivacyBanner'
import Header from './components/Header'
import Footer from './components/Footer'
import DropdownMenu from './components/DropdownMenu'
import StepsWizard from './components/StepsWizard'
//import LoginButton from './components/LoginButton'
//import Page from './components/headersExampleContext'
//import TaskApp from './components/example/TaskVisit'
//import ContextWrap from './components/context/ContextWrap'
//import AuthProvider from './components/context/AuthContextWrap'
//import LoginButtonFinal from './components/LoginButtonFinal'
//import { StatusBar, SaveButton } from './components/example/StatusSaveButtonTogether' //online status example
import WelcomeText from './components/WelcomeText'
//import EnvComponent from './components/context/OnMount'

function App() {
  
  function handleMenuSelection(selectedOption) {
    if (!!selectedOption) {
      setSelectedAction(selectedOption);
      setUpdateKey(Date.now());
    }
  }
  return (
    <div className="body-wrapper">
      <Header/>

          <div className="container-subheader">
            <div className="subheader-menu-container">
              <PrivacyBanner />
              <DropdownMenu handleMenuSelection={handleMenuSelection}/>
            </div>
          </div>
          <WelcomeText/>
          <StepsWizard/>

      <Footer />
    </div>
  )
}

export default App

//          <StatusBar/>
//<SaveButton/>
//          <EnvComponent/>
//</AuthProvider>            <LoginButtonFinal/>
//      <Page/>
//<LoginButton/>
//        <TaskApp/>

// </AuthProvider>

//      <ContextWrap>