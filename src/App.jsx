import './App.css'
import PrivacyBanner from './components/PrivacyBanner'
import Header from './components/Header'
import Footer from './components/Footer'
import DropdownMenu from './components/DropdownMenu'
import StepsWizard from './components/StepsWizard'
import AuthProvider from './components/context/AuthProviderContext'
import LoginButton from './components/LoginButton'
import WelcomeAlert from './components/WelcomeAlert'
import Greetings from './components/Greetings'

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
            <div className="privacy-banner"><PrivacyBanner /></div>
            <div className="greetings"><Greetings/></div>
            <div className="login-container">
              <div className='dropdown-menu'><DropdownMenu handleMenuSelection={handleMenuSelection}/></div>
              <div className="login-button"><LoginButton/></div>
            </div>
          </div> 
          <WelcomeAlert/>
          <div className='container-form'><StepsWizard/></div>
          </AuthProvider>
      <Footer />
    </div>
  )
}

export default App




//here is the logic of my trials
//import WelcomeText from './components/WelcomeText'
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