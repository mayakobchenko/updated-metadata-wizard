import './App.css'
import PrivacyBanner from './components/PrivacyBanner'
import Header from './components/Header'
import Footer from './components/Footer'
import DropdownMenu from './components/DropdownMenu'
import StepsWizard from './components/StepsWizard'
import LoginButton from './components/LoginButton'
//import Page from './components/headersExampleContext'
import ContextWrap from './components/context/ContextWrap'

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
      <ContextWrap>
        <div className="container-subheader">
          <div className="subheader-menu-container">
            <PrivacyBanner />
            <DropdownMenu handleMenuSelection={handleMenuSelection}/>
            <LoginButton/>
          </div>
        </div>
        <StepsWizard/>
      </ContextWrap>  
      <Footer />
    </div>
  )
}

export default App
//      <Page/>
//<LoginButton/>