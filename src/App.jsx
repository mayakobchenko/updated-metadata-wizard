import './App.css'
import PrivacyBanner from './components/PrivacyBanner'
import Header from './components/Header'
import Footer from './components/Footer'
import DropdownMenu from './components/DropdownMenu'
import StepsWizard from './components/StepsWizard'
//import LoginButton from './components/LoginButton'
//import ContextWrap from './components/context/ContextWrap'
import AuthProvider from './components/context/AuthProviderContext'
import LoginButtonFinal from './components/LoginButtonFinal'
//import WelcomeText from './components/WelcomeText'
import WelcomeAlert from './components/WelcomeAlert'

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
          <AuthProvider>
          <div className="container-subheader">
            <div className="subheader-menu-container">
              <PrivacyBanner />
              <DropdownMenu handleMenuSelection={handleMenuSelection}/>
              <LoginButtonFinal/>
            </div>
          </div>
          <WelcomeAlert/>
          <StepsWizard/>
          </AuthProvider>
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
//import Page from './components/headersExampleContext'
//import TaskApp from './components/example/TaskVisit'
//import EnvComponent from './components/context/OnMount'
//import { StatusBar, SaveButton } from './components/example/StatusSaveButtonTogether' //online status example