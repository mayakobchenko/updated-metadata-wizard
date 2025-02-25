import { useState } from 'react'
import './App.css'
import PrivacyBanner from './components/PrivacyBanner'
import Header from './components/Header'
import DropdownMenu from './components/DropdownMenu'
import StepsWizard from './components/StepsWizard'

function App() {
  
  function handleMenuSelection(selectedOption) {
    if (!!selectedOption) {
      setSelectedAction(selectedOption);
      setUpdateKey(Date.now());
    }
  }
  return (
  <div>
    <Header/>
    <div className="container-subheader">
      <div className="subheader-menu-container">
        <PrivacyBanner />
        <DropdownMenu handleMenuSelection={handleMenuSelection}/>
      </div>
    </div>
    <StepsWizard/>  
  </div>
  )
}

export default App
