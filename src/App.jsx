import './App.css'
import PrivacyBanner from './components/PrivacyBanner'
import Header from './components/Header'
import Footer from './components/Footer'
import DropdownMenu from './components/DropdownMenu'
import StepsWizard from './components/StepsWizard'
import NewContextProvider from './components/context/NewContextProvider'
import LoginButton from './components/LoginButton'
import Greetings from './components/Greetings'

function App() {

  function handleMenuSelection(selection) {
    if (selection) {
      console.log('dropdown menu selected:', selection)
      {/*setSelectedAction(selection);
    setUpdateKey(Date.now());*/}
    }
  }
  return (
    <div className="body-wrapper">
      <Header/>
        <NewContextProvider>
          <div className="container-subheader">
            <div className="privacy-banner"><PrivacyBanner /></div>
            <div className="greetings"><Greetings/></div>
            <div className="login-container">
              <div className='dropdown-menu'><DropdownMenu handleMenuSelection={handleMenuSelection}/></div>
              <div className="login-button"><LoginButton/></div>
            </div>
          </div> 
          <div className='container-form'><StepsWizard/></div>
        </NewContextProvider>
      <Footer />
    </div>
  )
}

export default App